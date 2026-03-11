import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppShell from '@/components/layout/AppShell'
import Home from '@/pages/Home'
import Marketplace from '@/pages/Marketplace'
import AgentConfig from '@/pages/config/AgentConfig'
import MCPServerConfig from '@/pages/config/MCPServerConfig'
import WorkflowEditor from '@/pages/config/WorkflowEditor'
import Assistant from '@/pages/Assistant'
import AccountSettings from '@/pages/AccountSettings'
import { useAppDispatch, useAppSelector } from '@/store'
import { setAuth } from '@/store/slices/authSlice'
import { setAgents } from '@/store/slices/agentsSlice'
import { setServers } from '@/store/slices/mcpServersSlice'

// Demo data for MVP — seed some agents, servers, workflows so the UI isn't empty
import { seedDemoData } from '@/data/seed'

function AppContent() {
  const dispatch = useAppDispatch()
  const darkMode = useAppSelector((s) => s.theme.darkMode)
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)

  useEffect(() => {
    // For MVP: auto-authenticate with a demo user since Keycloak isn't configured
    if (!isAuthenticated) {
      dispatch(
        setAuth({
          user: {
            keycloakId: 'demo-user-001',
            username: 'Lukas',
            email: 'lukas@cognizant.com',
            role: 'ADMIN',
            preferences: { darkMode: false },
            loggedInAt: new Date().toISOString(),
          },
          token: 'demo-token',
        })
      )
    }
  }, [isAuthenticated, dispatch])

  useEffect(() => {
    seedDemoData(dispatch)
  }, [dispatch])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/config/agents" element={<AgentConfig />} />
          <Route path="/config/mcp-servers" element={<MCPServerConfig />} />
          <Route path="/config/workflows" element={<WorkflowEditor />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/account" element={<AccountSettings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AppShell>
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'bg-card text-card-foreground border border-border shadow-lg',
          duration: 3000,
        }}
      />
    </BrowserRouter>
  )
}

export default function App() {
  return <AppContent />
}
