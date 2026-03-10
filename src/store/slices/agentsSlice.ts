import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { Agent } from '@/types'
import type { AgentFormData } from '@/types/forms'
import { agentsApi } from '@/api/agents'
import { generateId } from '@/utils/helpers'
import { deriveHealthEndpoint } from '@/utils/validation'

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
    ...data,
    healthEndpoint: deriveHealthEndpoint(data.url, data.healthEndpoint),
    status: 'unknown',
    createdAt: now,
    updatedAt: now,
  }
  try {
    return await agentsApi.create(data)
  } catch {
    return agent // fallback to local
  }
})

export const updateAgent = createAsyncThunk('agents/update', async ({ id, data }: { id: string; data: Partial<AgentFormData> }) => {
  try {
    return await agentsApi.update(id, data)
  } catch {
    return { id, ...data } as Partial<Agent> & { id: string }
  }
})

export const deleteAgent = createAsyncThunk('agents/delete', async (id: string) => {
  try {
    await agentsApi.delete(id)
  } catch {
    // proceed with local delete
  }
  return id
})

const agentsSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {
    updateAgentStatus(state, action: PayloadAction<{ id: string; status: 'online' | 'offline' }>) {
      const agent = state.agents.find((a) => a.id === action.payload.id)
      if (agent) agent.status = action.payload.status
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
      .addCase(createAgent.fulfilled, (state, action) => { state.agents.push(action.payload as Agent) })
      .addCase(updateAgent.fulfilled, (state, action) => {
        const idx = state.agents.findIndex((a) => a.id === action.payload.id)
        if (idx !== -1) state.agents[idx] = { ...state.agents[idx], ...action.payload, updatedAt: new Date().toISOString() }
      })
      .addCase(deleteAgent.fulfilled, (state, action) => {
        state.agents = state.agents.filter((a) => a.id !== action.payload)
      })
  },
})

export const { updateAgentStatus, setAgents } = agentsSlice.actions
export default agentsSlice.reducer
