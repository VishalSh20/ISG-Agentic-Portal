import apiClient from './client'
import type { Workflow } from '@/types'
import type { WorkflowFormData } from '@/types/forms'

export const workflowsApi = {
  getAll: () => apiClient.get<Workflow[]>('/workflows').then((r) => r.data),
  create: (data: WorkflowFormData) => apiClient.post<Workflow>('/workflows', data).then((r) => r.data),
  update: (id: string, data: Partial<WorkflowFormData>) => apiClient.put<Workflow>(`/workflows/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/workflows/${id}`),
}
