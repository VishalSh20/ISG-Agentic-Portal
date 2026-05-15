import type { AgentSkill } from './index'

export interface AgentFormData {
  title: string
  description: string
  url: string
  skills?: AgentSkill[]
  enabled?: boolean
  cardUrl: string
  headers?: Record<string, string>
}

export interface MCPServerFormData {
  title: string
  description: string
  url: string
  healthEndpoint: string
  tools: { name: string; description: string }[]
}

export interface WorkflowFormData {
  name: string
  description: string
  steps: { id: string; order: number; instruction: string; toolHint?: string }[]
  associatedAgentId?: string
}
