import { store } from '@/store'

interface QueryRequest {
  query: string
  thread_id?: string
}

interface QueryResponse {
  response: string
  thread_id: string
}

const ORCHESTRATOR_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const MASTER_BASE = import.meta.env.VITE_MASTER_API_BASE_URL || 'http://localhost:9003'

function getBaseUrl(agentId: string): string {
  return agentId === 'master' ? MASTER_BASE : ORCHESTRATOR_BASE
}

export const chatApi = {
  ask: async (
    query: string,
    threadId?: string,
    agentId: string = 'orchestrator',
  ): Promise<QueryResponse> => {
    const baseURL = getBaseUrl(agentId)
    const token = store.getState().auth.keycloakToken

    const res = await fetch(`${baseURL}/ask-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, thread_id: threadId } as QueryRequest),
    })

    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    return res.json() as Promise<QueryResponse>
  },

  askStream: async (
    query: string,
    onToken: (token: string) => void,
    threadId?: string,
    agentId: string = 'orchestrator',
  ): Promise<{ thread_id: string }> => {
    const baseURL = getBaseUrl(agentId)
    const token = store.getState().auth.keycloakToken

    const res = await fetch(`${baseURL}/ask-query-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, thread_id: threadId } as QueryRequest),
    })

    if (!res.ok) throw new Error(`Stream request failed: ${res.status}`)

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let resolvedThreadId = threadId ?? ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const lines = decoder.decode(value, { stream: true }).split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') break
        try {
          const parsed = JSON.parse(raw)
          if (parsed.thread_id) resolvedThreadId = parsed.thread_id
          if (parsed.token) onToken(parsed.token)
          if (parsed.error) throw new Error(parsed.error)
        } catch {
          // ignore malformed chunks
        }
      }
    }

    return { thread_id: resolvedThreadId }
  },
}
