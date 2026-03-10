import type { WorkflowStep } from '@/types'

export function normalizeStepOrder(steps: WorkflowStep[]): WorkflowStep[] {
  return steps.map((step, index) => ({
    ...step,
    order: index + 1,
  }))
}
