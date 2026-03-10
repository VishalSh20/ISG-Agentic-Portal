import type { ChatMessage } from '@/types'

export function manageContextWindow(
  messages: ChatMessage[],
  newMessage: ChatMessage,
  maxContextSize: number = 10
): { updatedMessages: ChatMessage[]; contextForApi: ChatMessage[] } {
  const updatedMessages = [...messages, newMessage]
  const contextForApi = updatedMessages
    .filter((m) => m.role !== 'system')
    .slice(-maxContextSize)
  return { updatedMessages, contextForApi }
}
