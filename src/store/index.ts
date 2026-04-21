import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'

import authReducer from './slices/authSlice'
import themeReducer from './slices/themeSlice'
import agentsReducer from './slices/agentsSlice'
import mcpServersReducer from './slices/mcpServersSlice'
import workflowsReducer from './slices/workflowsSlice'
import chatReducer from './slices/chatSlice'
import xmlAssistReducer from './slices/xmlAssistSlice'

const rootReducer = combineReducers({
  auth: authReducer,
  theme: themeReducer,
  agents: agentsReducer,
  mcpServers: mcpServersReducer,
  workflows: workflowsReducer,
  chat: chatReducer,
  xmlAssist: xmlAssistReducer,
})

const persistConfig = {
  key: 'isg-agentic-core',
  storage,
  whitelist: ['auth', 'theme', 'chat', 'xmlAssist'],
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
