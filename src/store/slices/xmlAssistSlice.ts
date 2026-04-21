import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { uploadXmlFile, getChangeHistory, deleteSession } from '@/api/xmlAssist'
import type {
  XmlAssistState,
  XmlAssistSession,
  XmlAssistMessage,
  XmlAssistActivity,
  XmlChangeEvent,
} from '@/types/xmlAssist'

const initialState: XmlAssistState = {
  sessions: [],
  activeSessionId: null,
  messages: {},
  activities: {},
  changeHistory: {},
  xmlContent: {},
  uploading: false,
  streaming: false,
  error: null,
}

/* ── Async thunks ── */

export const uploadXml = createAsyncThunk(
  'xmlAssist/uploadXml',
  async (file: File) => {
    const data = await uploadXmlFile(file)
    const displayName = file.name.replace(/\.xml$/i, '')
    const session: XmlAssistSession = {
      id: data.session_id,
      filename: file.name,
      displayName,
      version: data.version,
      createdAt: new Date().toISOString(),
    }
    return session
  },
)

export const fetchChangeHistory = createAsyncThunk(
  'xmlAssist/fetchChangeHistory',
  async (sessionId: string) => {
    const data = await getChangeHistory(sessionId)
    return { sessionId, events: data.events as XmlChangeEvent[] }
  },
)

export const deleteXmlSession = createAsyncThunk(
  'xmlAssist/deleteXmlSession',
  async (sessionId: string) => {
    await deleteSession(sessionId)
    return sessionId
  },
)

/* ── Slice ── */

const xmlAssistSlice = createSlice({
  name: 'xmlAssist',
  initialState,
  reducers: {
    setActiveSession(state, action: PayloadAction<string | null>) {
      state.activeSessionId = action.payload
    },

    switchSession(state, action: PayloadAction<string>) {
      state.activeSessionId = action.payload
      state.streaming = false
    },

    startNewSession(state) {
      state.activeSessionId = null
      state.streaming = false
    },

    addMessage(state, action: PayloadAction<{ sessionId: string; message: XmlAssistMessage }>) {
      const { sessionId, message } = action.payload
      if (!state.messages[sessionId]) state.messages[sessionId] = []
      state.messages[sessionId].push(message)
    },

    addActivity(state, action: PayloadAction<{ sessionId: string; activity: XmlAssistActivity }>) {
      const { sessionId, activity } = action.payload
      if (!state.activities[sessionId]) state.activities[sessionId] = []
      state.activities[sessionId].push(activity)
    },

    updateActivityStatus(
      state,
      action: PayloadAction<{ sessionId: string; activityId: string; status: 'done' | 'failed' }>,
    ) {
      const { sessionId, activityId, status } = action.payload
      const list = state.activities[sessionId]
      if (list) {
        const item = list.find((a) => a.id === activityId)
        if (item) item.status = status
      }
    },

    clearActivities(state, action: PayloadAction<string>) {
      state.activities[action.payload] = []
    },

    addChangeEntry(state, action: PayloadAction<{ sessionId: string; entry: XmlChangeEvent }>) {
      const { sessionId, entry } = action.payload
      if (!state.changeHistory[sessionId]) state.changeHistory[sessionId] = []
      state.changeHistory[sessionId].push(entry)
      // Also update session version
      const session = state.sessions.find((s) => s.id === sessionId)
      if (session) session.version = entry.version
    },

    removeLastChangeEntry(state, action: PayloadAction<string>) {
      const list = state.changeHistory[action.payload]
      if (list && list.length > 0) list.pop()
    },

    setStreaming(state, action: PayloadAction<boolean>) {
      state.streaming = action.payload
    },

    setXmlContent(state, action: PayloadAction<{ sessionId: string; content: string }>) {
      state.xmlContent[action.payload.sessionId] = action.payload.content
    },

    updateXmlContent(state, action: PayloadAction<{ sessionId: string; content: string }>) {
      state.xmlContent[action.payload.sessionId] = action.payload.content
    },

    clearSessionData(state, action: PayloadAction<string>) {
      const id = action.payload
      delete state.messages[id]
      delete state.activities[id]
      delete state.changeHistory[id]
      delete state.xmlContent[id]
      state.sessions = state.sessions.filter((s) => s.id !== id)
      if (state.activeSessionId === id) state.activeSessionId = null
    },
  },

  extraReducers: (builder) => {
    builder
      // Upload
      .addCase(uploadXml.pending, (state) => {
        state.uploading = true
        state.error = null
      })
      .addCase(uploadXml.fulfilled, (state, action) => {
        state.uploading = false
        state.sessions.unshift(action.payload)
        state.activeSessionId = action.payload.id
        state.messages[action.payload.id] = []
        state.activities[action.payload.id] = []
        state.changeHistory[action.payload.id] = []
      })
      .addCase(uploadXml.rejected, (state, action) => {
        state.uploading = false
        state.error = action.error.message || 'Upload failed'
      })

      // Fetch history
      .addCase(fetchChangeHistory.fulfilled, (state, action) => {
        state.changeHistory[action.payload.sessionId] = action.payload.events
      })

      // Delete session
      .addCase(deleteXmlSession.fulfilled, (state, action) => {
        const id = action.payload
        delete state.messages[id]
        delete state.activities[id]
        delete state.changeHistory[id]
        delete state.xmlContent[id]
        state.sessions = state.sessions.filter((s) => s.id !== id)
        if (state.activeSessionId === id) state.activeSessionId = null
      })
  },
})

export const {
  setActiveSession,
  switchSession,
  startNewSession,
  addMessage,
  addActivity,
  updateActivityStatus,
  clearActivities,
  addChangeEntry,
  removeLastChangeEntry,
  setStreaming,
  setXmlContent,
  updateXmlContent,
  clearSessionData,
} = xmlAssistSlice.actions

export default xmlAssistSlice.reducer
