import { type LucideIcon } from 'lucide-react'

export interface Agent {
  id: string
  title: string
  description: string
  url: string
  healthEndpoint: string
  status: 'online' | 'offline' | 'unknown'
  capabilities: string[]
  category?: string
  createdAt: string
  updatedAt: string
}

export interface MCPServer {
  id: string
  title: string
  description: string
  url: string
  healthEndpoint: string
  status: 'online' | 'offline' | 'unknown'
  tools: MCPTool[]
  createdAt: string
  updatedAt: string
}

export interface MCPTool {
  name: string
  description: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  associatedAgentId?: string
  createdAt: string
  updatedAt: string
}

export interface WorkflowStep {
  id: string
  order: number
  instruction: string
  toolHint?: string
}

export interface ChatThread {
  id: string
  userId: string
  title: string
  agentId: string
  workflowId?: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  stepsExecuted?: string[]
}

export interface User {
  keycloakId: string
  username: string
  email: string
  role: 'USER' | 'ADMIN'
  preferences: UserPreferences
  loggedInAt: string
}

export interface UserPreferences {
  darkMode: boolean
  defaultAgentId?: string
  defaultWorkflowId?: string
}

export interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  path: string
  requiredRole?: 'USER' | 'ADMIN'
  children?: NavItem[]
}
