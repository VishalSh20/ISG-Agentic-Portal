import type { Agent, Workflow } from '@/types'

export function buildSystemPrompt(agent: Agent, workflow?: Workflow): string {
  const parts: string[] = []

  parts.push(`You are ${agent.title}. ${agent.description}`)

  if (agent.capabilities.length > 0) {
    parts.push(`Your capabilities: ${agent.capabilities.join(', ')}`)
  }

  if (workflow && workflow.steps.length > 0) {
    parts.push(`\nFollow these workflow steps in order:`)
    const sorted = [...workflow.steps].sort((a, b) => a.order - b.order)
    for (const step of sorted) {
      const toolNote = step.toolHint ? ` (use tool: ${step.toolHint})` : ''
      parts.push(`${step.order}. ${step.instruction}${toolNote}`)
    }
  }

  parts.push(`\nRespond in markdown format. Be precise and actionable.`)

  return parts.join('\n')
}
