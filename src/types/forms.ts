export interface AgentFormData {
  title: string
  description: string
  url: string
  healthEndpoint: string
  capabilities: string[]
  category?: string
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
