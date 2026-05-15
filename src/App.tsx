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
import XmlAssist from '@/pages/XmlAssist'
import AccountSettings from '@/pages/AccountSettings'
import Auth from '@/pages/Auth'
import { useAppDispatch, useAppSelector } from '@/store'
import { restoreSession } from '@/store/slices/authSlice'
import { fetchAgents, refreshAllAgents } from '@/store/slices/agentsSlice'
import { fetchServers } from '@/store/slices/mcpServersSlice'
import { Loader2 } from 'lucide-react'

// Demo data for MVP — seeds MCP servers & workflows (agents now come from data_server)
import { seedDemoData } from '@/data/seed'

function AppContent() {
  const dispatch = useAppDispatch()
  const darkMode = useAppSelector((s) => s.theme.darkMode)
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const loading = useAppSelector((s) => s.auth.loading)

  useEffect(() => {
    dispatch(restoreSession())
  }, [dispatch])

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchAgents())
        .unwrap()
        .then(() => {
          dispatch(refreshAllAgents())
        })
        .catch(() => {
          seedDemoData(dispatch)
        })
      dispatch(fetchServers())
    }
  }, [isAuthenticated, dispatch])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Navigate to="/auth" />} />
        </Routes>
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
          <Route path="/xml-assist" element={<XmlAssist />} />
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
