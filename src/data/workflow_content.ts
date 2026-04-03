import type { Workflow, WorkflowStep } from '@/types'
import { generateId } from '@/utils/helpers'

function step(order: number, instruction: string, toolHint?: string): WorkflowStep {
  return { id: generateId(), order, instruction, toolHint }
}

const now = new Date().toISOString()

export const staticWorkflows: Workflow[] = [
  {
    id: 'wf_churn_prediction',
    name: 'churn_prediction',
    description:
      'Predict, assess, analyse, or check churn risk for a case by gathering case details, account profile, related cases, and call transcripts.',
    steps: [
      step(1, 'Fetch the full summary of the case — including its description, account reference, customer notes, priority, and state.'),
      step(2, 'Using the account reference from step 1, fetch the account profile — including industry, segment, contract dates, and any existing risk indicators.'),
      step(3, 'Using the account reference, retrieve all recent cases for that account from the past 45–60 days, excluding the current case.'),
      step(4, 'From the cases retrieved in step 3, filter down to only those that are thematically similar to the current case based on its description.'),
      step(5, 'Retrieve the latest call transcript associated with the current case number.'),
      step(6, 'Merge all context gathered above and generate a churn prediction using the output format.'),
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'wf_property_damage',
    name: 'property_damage',
    description:
      'Validate, analyze, review, inspect, or check a case using validation and analysis MCP server tools.',
    steps: [
      step(1, 'Determine the case number from the user message. If missing, ask the user to provide it.'),
      step(2, 'Use validation tools from the validation MCP server to validate the case.'),
      step(3, 'Use analysis tools from the analysis MCP server to analyze the case.'),
      step(4, 'Reply using the structured output format.'),
    ],
    createdAt: now,
    updatedAt: now,
  },
]
