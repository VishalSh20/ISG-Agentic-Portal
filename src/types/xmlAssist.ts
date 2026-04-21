/* ── XML Assist domain types ── */

export interface XmlAssistSession {
  id: string
  filename: string
  displayName: string
  version: number
  createdAt: string
}

export interface XmlAssistMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface XmlAssistActivity {
  id: string
  type: 'tool_start' | 'tool_result' | 'error'
  toolName?: string
  summary: string
  status: 'pending' | 'done' | 'failed'
  timestamp: string
}

export interface XmlChangeEvent {
  version: number
  operation: 'add_element' | 'delete_element' | 'update_text' | 'update_attribute' | 'delete_attribute'
  xpath: string
  before: XmlChangeDetail[] | null
  after: XmlChangeDetail[] | null
  affected_count: number
  timestamp: string
  nl_query: string
}

export interface XmlChangeDetail {
  path: string
  text?: string
  tag?: string
  attr?: string
  value?: string
  attributes?: Record<string, string>
}

export interface XmlAssistState {
  sessions: XmlAssistSession[]
  activeSessionId: string | null
  messages: Record<string, XmlAssistMessage[]>
  activities: Record<string, XmlAssistActivity[]>
  changeHistory: Record<string, XmlChangeEvent[]>
  xmlContent: Record<string, string>
  uploading: boolean
  streaming: boolean
  error: string | null
}
