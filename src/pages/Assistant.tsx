import { useState, useRef, useEffect } from 'react'
import { Send, Plus, Trash2, MessageSquare, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAppDispatch, useAppSelector } from '@/store'
import { createThread, sendMessage, switchThread, deleteThread } from '@/store/slices/chatSlice'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function Assistant() {
  const dispatch = useAppDispatch()
  const threads = useAppSelector((s) => s.chat.threads)
  const activeThreadId = useAppSelector((s) => s.chat.activeThreadId)
  const loading = useAppSelector((s) => s.chat.loading)
  const agents = useAppSelector((s) => s.agents.agents)
  const workflows = useAppSelector((s) => s.workflows.workflows)
  const userPrefs = useAppSelector((s) => s.auth.user?.preferences)

  const activeThread = threads.find((t) => t.id === activeThreadId) || null

  const [selectedAgent, setSelectedAgent] = useState(userPrefs?.defaultAgentId || '')
  const [selectedWorkflow, setSelectedWorkflow] = useState(userPrefs?.defaultWorkflowId || '')
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages.length, loading])

  // Set defaults from preferences
  useEffect(() => {
    if (userPrefs?.defaultAgentId && !selectedAgent) setSelectedAgent(userPrefs.defaultAgentId)
    if (userPrefs?.defaultWorkflowId && !selectedWorkflow) setSelectedWorkflow(userPrefs.defaultWorkflowId)
  }, [userPrefs])

  const handleSend = async () => {
    const query = input.trim()
    if (!query || !selectedAgent) return

    try {
      if (!activeThread) {
        await dispatch(createThread({ agentId: selectedAgent, workflowId: selectedWorkflow || undefined }))
      }
      setInput('')
      await dispatch(sendMessage({ query, agentId: selectedAgent, workflowId: selectedWorkflow || undefined })).unwrap()
    } catch {
      toast.error('Failed to send message. Please try again.')
    }
  }

  const handleNewThread = async () => {
    if (!selectedAgent) { toast.error('Select an agent first'); return }
    await dispatch(createThread({ agentId: selectedAgent, workflowId: selectedWorkflow || undefined }))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full">
      {/* Thread sidebar */}
      <div className="w-64 border-r border-border flex flex-col bg-sidebar shrink-0 hidden md:flex">
        <div className="p-3 border-b border-border">
          <Button variant="outline" className="w-full justify-start" onClick={handleNewThread}>
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {threads.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer group transition-colors',
                  t.id === activeThreadId
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
                onClick={() => dispatch(switchThread(t.id))}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 truncate">{t.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); dispatch(deleteThread(t.id)) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
            {threads.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Agent/Workflow selectors */}
        <div className="flex items-center gap-3 p-3 border-b border-border">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Workflow (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No Workflow</SelectItem>
              {workflows.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto p-6 space-y-6">
            {!activeThread || activeThread.messages.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">How can I help you today?</h2>
                  <p className="text-muted-foreground mt-1">Select an agent and start a conversation</p>
                </div>
              </div>
            ) : (
              activeThread.messages.map((msg) => (
                <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-card border border-border rounded-xl p-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="border-0 shadow-none resize-none focus-visible:ring-0 min-h-[40px] max-h-32"
                rows={1}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || !selectedAgent || loading}
                className="shrink-0 rounded-lg"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
