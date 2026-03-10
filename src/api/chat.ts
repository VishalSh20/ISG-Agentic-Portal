import apiClient from './client'

interface AskPayload {
  query: string
  agentId: string
  workflowId?: string
  threadId: string
  messages: { role: string; content: string }[]
}

interface AskResponse {
  answer: string
  threadId: string
  stepsExecuted?: string[]
}

export const chatApi = {
  ask: (payload: AskPayload) => apiClient.post<AskResponse>('/ask', payload).then((r) => r.data),
}
