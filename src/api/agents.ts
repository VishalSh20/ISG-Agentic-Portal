import apiClient from './client'
import type { Agent } from '@/types'
import type { AgentFormData } from '@/types/forms'

export const agentsApi = {
  getAll: () => apiClient.get<Agent[]>('/agents').then((r) => r.data),
  create: (data: AgentFormData) => apiClient.post<Agent>('/agents', data).then((r) => r.data),
  update: (id: string, data: Partial<AgentFormData>) => apiClient.put<Agent>(`/agents/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/agents/${id}`),
}
