import apiClient from './client'
import type { MCPServer } from '@/types'
import type { MCPServerFormData } from '@/types/forms'

export const mcpServersApi = {
  getAll: () => apiClient.get<MCPServer[]>('/mcp-servers').then((r) => r.data),
  create: (data: MCPServerFormData) => apiClient.post<MCPServer>('/mcp-servers', data).then((r) => r.data),
  update: (id: string, data: Partial<MCPServerFormData>) => apiClient.put<MCPServer>(`/mcp-servers/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/mcp-servers/${id}`),
}
