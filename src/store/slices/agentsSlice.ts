import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { Agent } from '@/types'
import type { AgentFormData } from '@/types/forms'
import { agentsApi, probeAgentCard } from '@/api/agents'
import { generateId } from '@/utils/helpers'

interface AgentsState {
  agents: Agent[]
  loading: boolean
  error: string | null
}

const initialState: AgentsState = {
  agents: [],
  loading: false,
  error: null,
}

export const fetchAgents = createAsyncThunk('agents/fetchAll', async () => {
  return await agentsApi.getAll()
})

export const createAgent = createAsyncThunk('agents/create', async (data: AgentFormData) => {
  const now = new Date().toISOString()
  const agent: Agent = {
    id: generateId(),
    title: data.title,
    description: data.description,
    url: data.url,
    cardUrl: data.cardUrl,
    skills: data.skills ?? [],
    enabled: data.enabled ?? true,
    headers: data.headers,
    status: 'unknown',
    createdAt: now,
    updatedAt: now,
  }
  await agentsApi.create(agent)
  return agent
})

export const deleteAgent = createAsyncThunk('agents/delete', async (id: string) => {
  await agentsApi.delete(id)
  return id
})

export const setAgentEnabled = createAsyncThunk(
  'agents/setEnabled',
  async ({ id, enabled }: { id: string; enabled: boolean }) => {
    await agentsApi.update(id, { enabled })
    return { id, enabled }
  },
)

/** Re-probe one agent: refresh status + fields from the card endpoint. */
export const refreshAgent = createAsyncThunk(
  'agents/refresh',
  async (agent: Agent) => {
    const { status, card } = await probeAgentCard(agent.cardUrl, agent.headers)
    if (status === 'offline' || !card) {
      return { id: agent.id, status, patch: null }
    }
    const patch: Partial<Agent> = {
      title: card.name,
      description: card.description,
      url: card.url || agent.url,
      skills: card.skills ?? [],
    }
    // Persist refreshed fields; fire-and-forget — we still return the patch for local state.
    agentsApi.update(agent.id, patch).catch(() => {})
    return { id: agent.id, status, patch }
  },
)

/** Refresh every agent in parallel. */
export const refreshAllAgents = createAsyncThunk(
  'agents/refreshAll',
  async (_, { getState, dispatch }) => {
    const state = getState() as { agents: AgentsState }
    await Promise.allSettled(state.agents.agents.map((a) => dispatch(refreshAgent(a))))
  },
)

const agentsSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {
    updateAgentStatus(state, action: PayloadAction<{ id: string; status: 'online' | 'offline' }>) {
      const agent = state.agents.find((a) => a.id === action.payload.id)
      if (agent) agent.status = action.payload.status
    },
    toggleAgentEnabled(state, action: PayloadAction<{ id: string; enabled: boolean }>) {
      const agent = state.agents.find((a) => a.id === action.payload.id)
      if (agent) agent.enabled = action.payload.enabled
    },
    setAgents(state, action: PayloadAction<Agent[]>) {
      state.agents = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgents.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAgents.fulfilled, (state, action) => { state.loading = false; state.agents = action.payload })
      .addCase(fetchAgents.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Failed to fetch agents' })
      .addCase(createAgent.fulfilled, (state, action) => { state.agents.push(action.payload) })
      .addCase(deleteAgent.fulfilled, (state, action) => {
        state.agents = state.agents.filter((a) => a.id !== action.payload)
      })
      .addCase(setAgentEnabled.fulfilled, (state, action) => {
        const agent = state.agents.find((a) => a.id === action.payload.id)
        if (agent) agent.enabled = action.payload.enabled
      })
      .addCase(refreshAgent.fulfilled, (state, action) => {
        const agent = state.agents.find((a) => a.id === action.payload.id)
        if (!agent) return
        agent.status = action.payload.status
        if (action.payload.patch) {
          Object.assign(agent, action.payload.patch)
          agent.updatedAt = new Date().toISOString()
        }
      })
  },
})

export const { updateAgentStatus, toggleAgentEnabled, setAgents } = agentsSlice.actions
export default agentsSlice.reducer
