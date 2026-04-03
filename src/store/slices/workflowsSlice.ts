import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { Workflow } from '@/types'
import type { WorkflowFormData } from '@/types/forms'
import { workflowsApi } from '@/api/workflows'
import { generateId } from '@/utils/helpers'
import { normalizeStepOrder } from '@/utils/normalizeStepOrder'
import { staticWorkflows } from '@/data/workflow_content'

// Toggle this flag to switch between static data and API-driven workflows
const USE_STATIC_WORKFLOWS = true

interface WorkflowsState {
  workflows: Workflow[]
  loading: boolean
  error: string | null
}

const initialState: WorkflowsState = {
  workflows: USE_STATIC_WORKFLOWS ? staticWorkflows : [],
  loading: false,
  error: null,
}

export const fetchWorkflows = createAsyncThunk('workflows/fetchAll', async () => {
  if (USE_STATIC_WORKFLOWS) return staticWorkflows
  return await workflowsApi.getAll()
})

export const createWorkflow = createAsyncThunk('workflows/create', async (data: WorkflowFormData) => {
  const now = new Date().toISOString()
  const workflow: Workflow = {
    id: generateId(),
    name: data.name,
    description: data.description,
    steps: normalizeStepOrder(data.steps),
    associatedAgentId: data.associatedAgentId,
    createdAt: now,
    updatedAt: now,
  }
  try {
    return await workflowsApi.create(data)
  } catch {
    return workflow
  }
})

export const updateWorkflow = createAsyncThunk('workflows/update', async ({ id, data }: { id: string; data: Partial<WorkflowFormData> }) => {
  try {
    return await workflowsApi.update(id, data)
  } catch {
    return { id, ...data } as Partial<Workflow> & { id: string }
  }
})

export const deleteWorkflow = createAsyncThunk('workflows/delete', async (id: string) => {
  try { await workflowsApi.delete(id) } catch { /* local delete */ }
  return id
})

const workflowsSlice = createSlice({
  name: 'workflows',
  initialState,
  reducers: {
    clearAssociatedAgent(state, action) {
      state.workflows.forEach((w) => {
        if (w.associatedAgentId === action.payload) w.associatedAgentId = undefined
      })
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkflows.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchWorkflows.fulfilled, (state, action) => { state.loading = false; state.workflows = action.payload })
      .addCase(fetchWorkflows.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Failed to fetch workflows' })
      .addCase(createWorkflow.fulfilled, (state, action) => { state.workflows.push(action.payload as Workflow) })
      .addCase(updateWorkflow.fulfilled, (state, action) => {
        const idx = state.workflows.findIndex((w) => w.id === action.payload.id)
        if (idx !== -1) state.workflows[idx] = { ...state.workflows[idx], ...action.payload, updatedAt: new Date().toISOString() }
      })
      .addCase(deleteWorkflow.fulfilled, (state, action) => {
        state.workflows = state.workflows.filter((w) => w.id !== action.payload)
      })
  },
})

export const { clearAssociatedAgent } = workflowsSlice.actions
export default workflowsSlice.reducer
