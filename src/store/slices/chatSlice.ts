import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { ChatThread, ChatMessage } from '@/types'
import { generateId } from '@/utils/helpers'
import { chatApi } from '@/api/chat'
import { loadUserThreads as loadFromDb, saveThread, saveMessage, deleteThreadFromDb } from '@/api/chatPersistence'
import { buildSystemPrompt } from '@/utils/buildSystemPrompt'
import { manageContextWindow } from '@/utils/contextWindow'
import type { RootState } from '@/store'

interface ChatState {
  threads: ChatThread[]
  activeThreadId: string | null
  loading: boolean
  error: string | null
}

const initialState: ChatState = {
  threads: [],
  activeThreadId: null,
  loading: false,
  error: null,
}

export const loadUserThreads = createAsyncThunk('chat/loadUserThreads', async (userId: string) => {
  return await loadFromDb(userId)
})

export const createThread = createAsyncThunk(
  'chat/createThread',
  async ({ agentId, workflowId }: { agentId: string; workflowId?: string }, { getState }) => {
    const state = getState() as RootState
    const userId = state.auth.user?.keycloakId || 'anonymous'
    const now = new Date().toISOString()
    const thread: ChatThread = {
      id: generateId(),
      userId,
      title: 'New Chat',
      agentId,
      workflowId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    }
    await saveThread(thread)
    return thread
  }
)

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    { query, agentId, workflowId }: { query: string; agentId: string; workflowId?: string },
    { getState, dispatch }
  ) => {
    const state = getState() as RootState
    const thread = state.chat.threads.find((t) => t.id === state.chat.activeThreadId)
    if (!thread) throw new Error('No active thread')

    const agent = state.agents.agents.find((a) => a.id === agentId)
    const workflow = workflowId ? state.workflows.workflows.find((w) => w.id === workflowId) : undefined

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    }

    dispatch(chatSlice.actions.addMessage({ threadId: thread.id, message: userMsg }))
    await saveMessage(thread.id, userMsg)

    // Auto-title from first message
    if (thread.messages.length === 0) {
      dispatch(chatSlice.actions.updateThreadTitle({ threadId: thread.id, title: query.slice(0, 50) }))
    }

    const { contextForApi } = manageContextWindow(thread.messages, userMsg)

    const systemPrompt = agent ? buildSystemPrompt(agent, workflow) : 'You are a helpful assistant.'
    const messages = [
      { role: 'system', content: systemPrompt },
      ...contextForApi.map((m) => ({ role: m.role, content: m.content })),
    ]

    const response = await chatApi.ask({ query, agentId, workflowId, threadId: thread.id, messages })

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: response.answer,
      timestamp: new Date().toISOString(),
      stepsExecuted: response.stepsExecuted,
    }

    await saveMessage(thread.id, assistantMsg)
    return { threadId: thread.id, message: assistantMsg }
  }
)

export const deleteThread = createAsyncThunk('chat/deleteThread', async (threadId: string) => {
  await deleteThreadFromDb(threadId)
  return threadId
})

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    switchThread(state, action: PayloadAction<string>) {
      state.activeThreadId = action.payload
    },
    addMessage(state, action: PayloadAction<{ threadId: string; message: ChatMessage }>) {
      const thread = state.threads.find((t) => t.id === action.payload.threadId)
      if (thread) {
        thread.messages.push(action.payload.message)
        thread.updatedAt = new Date().toISOString()
      }
    },
    updateThreadTitle(state, action: PayloadAction<{ threadId: string; title: string }>) {
      const thread = state.threads.find((t) => t.id === action.payload.threadId)
      if (thread) thread.title = action.payload.title
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUserThreads.fulfilled, (state, action) => { state.threads = action.payload })
      .addCase(createThread.fulfilled, (state, action) => {
        state.threads.unshift(action.payload)
        state.activeThreadId = action.payload.id
      })
      .addCase(sendMessage.pending, (state) => { state.loading = true; state.error = null })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false
        const thread = state.threads.find((t) => t.id === action.payload.threadId)
        if (thread) {
          thread.messages.push(action.payload.message)
          thread.updatedAt = new Date().toISOString()
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to send message'
      })
      .addCase(deleteThread.fulfilled, (state, action) => {
        state.threads = state.threads.filter((t) => t.id !== action.payload)
        if (state.activeThreadId === action.payload) state.activeThreadId = null
      })
  },
})

export const { switchThread, addMessage, updateThreadTitle } = chatSlice.actions
export default chatSlice.reducer
