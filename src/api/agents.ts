import axios from 'axios'
import { supabase } from '@/lib/supabase'
import type { Agent, AgentCard, AgentSkill } from '@/types'

interface AgentRow {
  id: string
  title: string
  description: string
  url: string | null
  card_url: string
  skills: AgentSkill[] | null
  enabled: boolean
  created_at: string
  updated_at: string
}

interface AgentWithHeadersRow extends AgentRow {
  headers_plaintext: string | null
}

function rowToAgent(row: AgentWithHeadersRow): Agent {
  let headers: Record<string, string> | undefined
  if (row.headers_plaintext) {
    try {
      headers = JSON.parse(row.headers_plaintext) as Record<string, string>
    } catch {
      headers = undefined
    }
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    url: row.url ?? '',
    cardUrl: row.card_url,
    skills: row.skills ?? [],
    enabled: row.enabled,
    headers,
    status: 'unknown',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function encryptHeaders(headers?: Record<string, string>): Promise<string | null> {
  if (!headers || Object.keys(headers).length === 0) return null
  const plaintext = JSON.stringify(headers)
  const { data, error } = await supabase.rpc('encrypt_headers', { plaintext })
  if (error) throw error
  return data as string | null
}

export const agentsApi = {
  async getAll(): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('agents_with_headers')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map((r) => rowToAgent(r as AgentWithHeadersRow))
  },

  async create(agent: Agent): Promise<Agent> {
    const headers_enc = await encryptHeaders(agent.headers)
    const { error } = await supabase.from('agents').insert({
      id: agent.id,
      title: agent.title,
      description: agent.description,
      url: agent.url || null,
      card_url: agent.cardUrl,
      skills: agent.skills ?? [],
      enabled: agent.enabled ?? true,
      headers_enc,
    })
    if (error) throw error
    return agent
  },

  async update(id: string, patch: Partial<Agent>): Promise<void> {
    const update: Record<string, unknown> = {}
    if (patch.title !== undefined) update.title = patch.title
    if (patch.description !== undefined) update.description = patch.description
    if (patch.url !== undefined) update.url = patch.url || null
    if (patch.cardUrl !== undefined) update.card_url = patch.cardUrl
    if (patch.skills !== undefined) update.skills = patch.skills
    if (patch.enabled !== undefined) update.enabled = patch.enabled
    if (patch.headers !== undefined) {
      update.headers_enc = await encryptHeaders(patch.headers)
    }
    if (Object.keys(update).length === 0) return
    const { error } = await supabase.from('agents').update(update).eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('agents').delete().eq('id', id)
    if (error) throw error
  },
}

/** Fetch an A2A agent card from a fully-qualified card URL, with optional auth headers. */
export async function fetchAgentCard(
  cardUrl: string,
  headers?: Record<string, string>,
): Promise<AgentCard> {
  const res = await axios.get<AgentCard>(cardUrl, {
    timeout: 8000,
    headers: headers && Object.keys(headers).length > 0 ? headers : undefined,
  })
  return res.data
}

/** Check liveness via the card URL — returns status + fresh card on success. */
export async function probeAgentCard(
  cardUrl: string,
  headers?: Record<string, string>,
): Promise<{ status: 'online' | 'offline'; card: AgentCard | null }> {
  try {
    const card = await fetchAgentCard(cardUrl, headers)
    return { status: 'online', card }
  } catch {
    return { status: 'offline', card: null }
  }
}
