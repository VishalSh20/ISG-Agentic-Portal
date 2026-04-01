import axios from 'axios'
import type { MCPServer } from '@/types'
import type { MCPServerFormData } from '@/types/forms'
import apiClient from './client'

const DATA_SERVER = import.meta.env.VITE_DATA_SERVER_URL || 'http://localhost:8100'

export const mcpServersApi = {
  getAll: () => axios.get<MCPServer[]>(`${DATA_SERVER}/mcp-servers`).then((r) => r.data),
  create: (data: MCPServerFormData) => apiClient.post<MCPServer>('/mcp-servers', data).then((r) => r.data),
  update: (id: string, data: Partial<MCPServerFormData>) => apiClient.put<MCPServer>(`/mcp-servers/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/mcp-servers/${id}`),
}
