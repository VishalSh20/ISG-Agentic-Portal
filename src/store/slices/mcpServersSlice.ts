import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { MCPServer } from '@/types'
import type { MCPServerFormData } from '@/types/forms'
import { mcpServersApi } from '@/api/mcpServers'
import { generateId } from '@/utils/helpers'
import { deriveHealthEndpoint } from '@/utils/validation'

interface MCPServersState {
  servers: MCPServer[]
  loading: boolean
  error: string | null
}

const initialState: MCPServersState = {
  servers: [],
  loading: false,
  error: null,
}

export const fetchServers = createAsyncThunk('mcpServers/fetchAll', async () => {
  return await mcpServersApi.getAll()
})

export const createServer = createAsyncThunk('mcpServers/create', async (data: MCPServerFormData) => {
  const now = new Date().toISOString()
  const server: MCPServer = {
    id: generateId(),
    ...data,
    healthEndpoint: deriveHealthEndpoint(data.url, data.healthEndpoint),
    status: 'unknown',
    createdAt: now,
    updatedAt: now,
  }
  try {
    return await mcpServersApi.create(data)
  } catch {
    return server
  }
})

export const updateServer = createAsyncThunk('mcpServers/update', async ({ id, data }: { id: string; data: Partial<MCPServerFormData> }) => {
  try {
    return await mcpServersApi.update(id, data)
  } catch {
    return { id, ...data } as Partial<MCPServer> & { id: string }
  }
})

export const deleteServer = createAsyncThunk('mcpServers/delete', async (id: string) => {
  try { await mcpServersApi.delete(id) } catch { /* local delete */ }
  return id
})

const mcpServersSlice = createSlice({
  name: 'mcpServers',
  initialState,
  reducers: {
    updateServerStatus(state, action: PayloadAction<{ id: string; status: 'online' | 'offline' }>) {
      const s = state.servers.find((s) => s.id === action.payload.id)
      if (s) s.status = action.payload.status
    },
    setServers(state, action: PayloadAction<MCPServer[]>) {
      state.servers = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServers.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchServers.fulfilled, (state, action) => { state.loading = false; state.servers = action.payload })
      .addCase(fetchServers.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Failed to fetch servers' })
      .addCase(createServer.fulfilled, (state, action) => { state.servers.push(action.payload as MCPServer) })
      .addCase(updateServer.fulfilled, (state, action) => {
        const idx = state.servers.findIndex((s) => s.id === action.payload.id)
        if (idx !== -1) state.servers[idx] = { ...state.servers[idx], ...action.payload, updatedAt: new Date().toISOString() }
      })
      .addCase(deleteServer.fulfilled, (state, action) => {
        state.servers = state.servers.filter((s) => s.id !== action.payload)
      })
  },
})

export const { updateServerStatus, setServers } = mcpServersSlice.actions
export default mcpServersSlice.reducer
