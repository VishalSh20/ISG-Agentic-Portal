import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User, UserPreferences } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  keycloakToken: string | null
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  keycloakToken: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user = action.payload.user
      state.isAuthenticated = true
      state.keycloakToken = action.payload.token
    },
    clearAuth(state) {
      state.user = null
      state.isAuthenticated = false
      state.keycloakToken = null
    },
    updatePreferences(state, action: PayloadAction<Partial<UserPreferences>>) {
      if (state.user) {
        state.user.preferences = { ...state.user.preferences, ...action.payload }
      }
    },
  },
})

export const { setAuth, clearAuth, updatePreferences } = authSlice.actions
export default authSlice.reducer
