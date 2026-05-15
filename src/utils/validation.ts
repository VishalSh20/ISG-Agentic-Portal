import type { MCPServerFormData, WorkflowFormData } from '@/types/forms'

function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

export function validateMCPServer(data: MCPServerFormData): string[] {
  const errors: string[] = []
  if (!data.title || data.title.trim().length === 0) errors.push('Title is required')
  if (data.title && data.title.length > 100) errors.push('Title must be 100 characters or less')
  if (!data.url || !isValidUrl(data.url)) errors.push('A valid URL is required')
  return errors
}

export function validateWorkflow(data: WorkflowFormData): string[] {
  const errors: string[] = []
  if (!data.name || data.name.trim().length === 0) errors.push('Workflow name is required')
  if (data.name && data.name.length > 200) errors.push('Workflow name must be 200 characters or less')
  if (!data.steps || data.steps.length === 0) errors.push('At least one workflow step is required')
  if (data.steps) {
    data.steps.forEach((step, i) => {
      if (!step.instruction || step.instruction.trim().length === 0) {
        errors.push(`Step ${i + 1} instruction is required`)
      }
    })
  }
  return errors
}

export function deriveHealthEndpoint(url: string, healthEndpoint?: string): string {
  if (healthEndpoint && healthEndpoint.trim().length > 0) return healthEndpoint
  return `${url.replace(/\/$/, '')}/health`
}
