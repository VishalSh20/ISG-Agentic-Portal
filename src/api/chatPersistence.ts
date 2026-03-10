import { supabase } from '@/lib/supabase'
import type { ChatThread, ChatMessage } from '@/types'

export async function loadUserThreads(userId: string): Promise<ChatThread[]> {
  const { data: threads, error } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Failed to load threads:', error)
    return []
  }

  const result: ChatThread[] = []
  for (const t of threads || []) {
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', t.id)
      .order('timestamp', { ascending: true })

    result.push({
      id: t.id,
      userId: t.user_id,
      title: t.title,
      agentId: t.agent_id,
      workflowId: t.workflow_id || undefined,
      messages: (msgs || []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        role: m.role as ChatMessage['role'],
        content: m.content as string,
        timestamp: m.timestamp as string,
        stepsExecuted: m.steps_executed as string[] | undefined,
      })),
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    })
  }
  return result
}

export async function saveThread(thread: ChatThread): Promise<void> {
  await supabase.from('chat_threads').upsert({
    id: thread.id,
    user_id: thread.userId,
    title: thread.title,
    agent_id: thread.agentId,
    workflow_id: thread.workflowId || null,
    created_at: thread.createdAt,
    updated_at: thread.updatedAt,
  })
}

export async function saveMessage(threadId: string, message: ChatMessage): Promise<void> {
  await supabase.from('chat_messages').upsert({
    id: message.id,
    thread_id: threadId,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    steps_executed: message.stepsExecuted || null,
  })
}

export async function deleteThreadFromDb(threadId: string): Promise<void> {
  await supabase.from('chat_threads').delete().eq('id', threadId)
}
