import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { User, UserPreferences } from '@/types'
import { signIn, signUp, signOut, getSession, getProfile, buildUser } from '@/api/auth'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  accessToken: string | null
  loading: boolean
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  accessToken: null,
  loading: true, // true until session restore completes
}

export const restoreSession = createAsyncThunk('auth/restoreSession', async () => {
  const session = await getSession()
  if (!session) return null
  const profile = await getProfile(session.user.id)
  const user = buildUser(session.user.id, session.user.email!, profile)
  return { user, token: session.access_token }
})

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }: { email: string; password: string }) => {
    const { session } = await signIn(email, password)
    if (!session) throw new Error('Login failed — no session returned')
    const profile = await getProfile(session.user.id)
    const user = buildUser(session.user.id, session.user.email!, profile)
    return { user, token: session.access_token }
  },
)

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ email, password, username }: { email: string; password: string; username: string }) => {
    const { session } = await signUp(email, password, username)
    if (!session) throw new Error('Signup failed — no session returned. Is email confirmation disabled?')
    const profile = await getProfile(session.user.id)
    const user = buildUser(session.user.id, session.user.email!, profile)
    return { user, token: session.access_token }
  },
)

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  await signOut()
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user = action.payload.user
      state.isAuthenticated = true
      state.accessToken = action.payload.token
      state.loading = false
    },
    clearAuth(state) {
      state.user = null
      state.isAuthenticated = false
      state.accessToken = null
      state.loading = false
    },
    updatePreferences(state, action: PayloadAction<Partial<UserPreferences>>) {
      if (state.user) {
        state.user.preferences = { ...state.user.preferences, ...action.payload }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // restoreSession
      .addCase(restoreSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user
          state.isAuthenticated = true
          state.accessToken = action.payload.token
        }
        state.loading = false
      })
      .addCase(restoreSession.rejected, (state) => {
        state.loading = false
      })
      // loginUser
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.isAuthenticated = true
        state.accessToken = action.payload.token
        state.loading = false
      })
      // registerUser
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.isAuthenticated = true
        state.accessToken = action.payload.token
        state.loading = false
      })
      // logoutUser
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
        state.accessToken = null
      })
  },
})

export const { setAuth, clearAuth, updatePreferences } = authSlice.actions
export default authSlice.reducer
