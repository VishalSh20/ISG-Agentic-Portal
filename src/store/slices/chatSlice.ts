import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { ChatThread, ChatMessage } from '@/types'
import { generateId } from '@/utils/helpers'
import { chatApi } from '@/api/chat'
import { loadUserThreads as loadFromDb, saveThread, saveMessage, deleteThreadFromDb } from '@/api/chatPersistence'
import type { RootState } from '@/store'

interface ChatState {
  threads: ChatThread[]
  activeThreadId: string | null
  loading: boolean
  streaming: boolean
  error: string | null
}

const initialState: ChatState = {
  threads: [],
  activeThreadId: null,
  loading: false,
  streaming: false,
  error: null,
}

export const loadUserThreads = createAsyncThunk('chat/loadUserThreads', async (userId: string) => {
  return await loadFromDb(userId)
})

export const createThread = createAsyncThunk(
  'chat/createThread',
  async ({ agentId, workflowId }: { agentId: string; workflowId?: string }, { getState }) => {
    const state = getState() as RootState
    const userId = state.auth.user?.id || 'anonymous'
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
  async ({ query, agentId, workflowId }: { query: string; agentId: string; workflowId?: string }, { getState, dispatch }) => {
    const state = getState() as RootState
    const thread = state.chat.threads.find((t) => t.id === state.chat.activeThreadId)
    if (!thread) throw new Error('No active thread')

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    }

    dispatch(chatSlice.actions.addMessage({ threadId: thread.id, message: userMsg }))
    await saveMessage(thread.id, userMsg)

    // Auto-title from first message (strip to 50 chars)
    if (thread.messages.length === 0) {
      dispatch(chatSlice.actions.updateThreadTitle({ threadId: thread.id, title: query.slice(0, 50) }))
    }

    const response = await chatApi.ask(query, thread.id, agentId)

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: response.response,
      timestamp: new Date().toISOString(),
    }

    await saveMessage(thread.id, assistantMsg)
    return { threadId: thread.id, message: assistantMsg }
  }
)

export const deleteThread = createAsyncThunk('chat/deleteThread', async (threadId: string) => {
  await deleteThreadFromDb(threadId)
  return threadId
})

// Streaming thunk — dispatches token-by-token via appendStreamToken
export const sendMessageStream = createAsyncThunk(
  'chat/sendMessageStream',
  async ({ query, agentId, workflowId, systemPromptFile }: { query: string; agentId: string; workflowId?: string; systemPromptFile?: string }, { getState, dispatch }) => {
    const state = getState() as RootState
    const thread = state.chat.threads.find((t) => t.id === state.chat.activeThreadId)
    if (!thread) throw new Error('No active thread')

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    }
    dispatch(chatSlice.actions.addMessage({ threadId: thread.id, message: userMsg }))
    await saveMessage(thread.id, userMsg)

    if (thread.messages.length === 0) {
      dispatch(chatSlice.actions.updateThreadTitle({ threadId: thread.id, title: query.slice(0, 50) }))
    }

    // Seed an empty assistant message that we'll fill token-by-token
    const assistantMsgId = generateId()
    dispatch(chatSlice.actions.addMessage({
      threadId: thread.id,
      message: { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
    }))

    const { thread_id } = await chatApi.askStream(
      query,
      (token) => dispatch(chatSlice.actions.appendStreamToken({ threadId: thread.id, messageId: assistantMsgId, token })),
      thread.id,
      agentId,
      systemPromptFile,
    )

    // Persist the fully assembled message
    const finalState = getState() as RootState
    const finalThread = finalState.chat.threads.find((t) => t.id === thread.id)
    const finalMsg = finalThread?.messages.find((m) => m.id === assistantMsgId)
    if (finalMsg) await saveMessage(thread.id, finalMsg)

    return { threadId: thread.id, assistantMsgId, backendThreadId: thread_id }
  }
)

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
    appendStreamToken(state, action: PayloadAction<{ threadId: string; messageId: string; token: string }>) {
      const thread = state.threads.find((t) => t.id === action.payload.threadId)
      const msg = thread?.messages.find((m) => m.id === action.payload.messageId)
      if (msg) msg.content += action.payload.token
    },
    startNewChat(state) {
      state.activeThreadId = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUserThreads.fulfilled, (state, action) => {
        state.threads = action.payload
      })
      .addCase(createThread.fulfilled, (state, action) => {
        state.threads.unshift(action.payload)
        state.activeThreadId = action.payload.id
      })
      .addCase(sendMessage.pending, (state) => {
        state.loading = true
        state.error = null
      })
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
        if (state.activeThreadId === action.payload) {
          state.activeThreadId = state.threads[0]?.id || null
        }
      })
      .addCase(sendMessageStream.pending, (state) => {
        state.streaming = true
        state.error = null
      })
      .addCase(sendMessageStream.fulfilled, (state) => {
        state.streaming = false
      })
      .addCase(sendMessageStream.rejected, (state, action) => {
        state.streaming = false
        state.error = action.error.message || 'Streaming failed'
      })
  },
})

export const { switchThread, addMessage, updateThreadTitle, appendStreamToken, startNewChat } = chatSlice.actions
export default chatSlice.reducer
