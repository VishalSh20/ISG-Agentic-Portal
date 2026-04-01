import axios from 'axios'
import apiClient from './client'
import type { Agent } from '@/types'
import type { AgentFormData } from '@/types/forms'

const DATA_SERVER = import.meta.env.VITE_DATA_SERVER_URL || 'http://localhost:8100'

export const agentsApi = {
  getAll: () => axios.get<Agent[]>(`${DATA_SERVER}/agents`).then((r) => r.data),
  create: (data: AgentFormData) => apiClient.post<Agent>('/agents', data).then((r) => r.data),
  update: (id: string, data: Partial<AgentFormData>) => apiClient.put<Agent>(`/agents/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/agents/${id}`),
}

/** Check if an agent is reachable by hitting its A2A agent-card endpoint */
export async function checkAgentHealth(url: string): Promise<'online' | 'offline'> {
  try {
    const ep = `${url.replace(/\/$/, '')}/.well-known/agent-card.json`
    await axios.get(ep, { timeout: 3000 })
    return 'online'
  } catch {
    return 'offline'
  }
}
