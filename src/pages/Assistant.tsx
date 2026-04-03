import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAppDispatch, useAppSelector } from '@/store'
import { createThread, sendMessageStream } from '@/store/slices/chatSlice'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const ORCHESTRATOR_AGENT_ID = 'orchestrator'
const MASTER_AGENT_ID = 'master'

const AGENT_OPTIONS = [
  { id: ORCHESTRATOR_AGENT_ID, label: 'Orchestrator' },
  { id: MASTER_AGENT_ID, label: 'Master' },
] as const

/* ── Markdown renderers for assistant messages ── */
const markdownComponents = {
  a({ href, children }: { href?: string; children?: React.ReactNode }) {
    const imageExts = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i
    if (href && imageExts.test(href)) {
      const alt = typeof children === 'string' ? children : String(children)
      return (
        <span className="block my-2">
          <img src={href} alt={alt} className="max-w-full rounded-lg border border-border" />
        </span>
      )
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
        {children}
      </a>
    )
  },
  img({ src, alt }: { src?: string; alt?: string }) {
    return <img src={src} alt={alt ?? ''} className="max-w-full rounded-lg border border-border my-2" />
  },
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <MessageSquare className="size-8 text-primary" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold text-foreground">How can I help you today?</h2>
        <p className="text-sm text-muted-foreground">Start a conversation with the Master Orchestrator</p>
      </div>
    </div>
  )
}

/* ── Single chat bubble ── */
function ChatBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-5 py-3.5 text-[0.938rem] leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card border border-border',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="markdown-body max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Streaming indicator ── */
function StreamingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Thinking…</span>
      </div>
    </div>
  )
}

/* ── Main component ── */
export default function Assistant() {
  const dispatch = useAppDispatch()
  const threads = useAppSelector((s) => s.chat.threads)
  const activeThreadId = useAppSelector((s) => s.chat.activeThreadId)
  const loading = useAppSelector((s) => s.chat.loading)
  const streaming = useAppSelector((s) => s.chat.streaming)
  const workflows = useAppSelector((s) => s.workflows.workflows)
  const userPrefs = useAppSelector((s) => s.auth.user?.preferences)

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null

  /* Once a message has been sent, the thread's agent & workflow are locked */
  const threadLocked = (activeThread?.messages.length ?? 0) > 0

  const defaultWorkflow = userPrefs?.defaultWorkflowId || (workflows.length > 0 ? workflows[0].id : '')
  const [selectedWorkflow, setSelectedWorkflow] = useState(defaultWorkflow)
  const [selectedAgent, setSelectedAgent] = useState<string>(userPrefs?.defaultAgentId || ORCHESTRATOR_AGENT_ID)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  /* auto-scroll on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages.length, loading, streaming])

  /* Keep selectors in sync with the active thread's stored values.
     Only sync from threads that already have messages (i.e. are "committed").
     Empty threads (just created by New Chat) are ignored so the user can
     freely pick agent & workflow before sending the first message. */
  useEffect(() => {
    if (activeThread && activeThread.messages.length > 0) {
      setSelectedAgent(activeThread.agentId)
      setSelectedWorkflow(activeThread.workflowId || (workflows.length > 0 ? workflows[0].id : ''))
    }
  }, [activeThread?.id, activeThread?.messages.length])

  const handleSend = async () => {
    const query = input.trim()
    if (!query) return
    try {
      const agentId = selectedAgent
      const workflowId = agentId === MASTER_AGENT_ID ? (selectedWorkflow || undefined) : undefined
      const selectedWf = workflows.find((w) => w.id === workflowId)
      const systemPromptFile = selectedWf?.name

      if (!activeThread) {
        await dispatch(createThread({ agentId, workflowId })).unwrap()
      }
      setInput('')
      await dispatch(sendMessageStream({ query, agentId, workflowId, systemPromptFile })).unwrap()
    } catch {
      toast.error('Failed to send message. Please try again.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      {/*
        The parent AppShell renders this inside <main class="flex-1 overflow-y-auto">.
        We use h-full so the chat fills the available viewport without fighting the shell layout.
      */}
      <div className="flex h-full">
        {/* ── Chat area ── */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Toolbar: agent + workflow selectors */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-2">
            <Select value={selectedAgent} onValueChange={setSelectedAgent} disabled={threadLocked}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Agent" />
              </SelectTrigger>
              <SelectContent>
                {AGENT_OPTIONS.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>{agent.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedAgent === MASTER_AGENT_ID && (
              <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow} disabled={threadLocked}>
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
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 overflow-y-scroll">
            <div className="mx-auto max-w-[60rem] space-y-6 p-6">
              {!activeThread || activeThread.messages.length === 0 ? (
                <EmptyState />
              ) : (
                activeThread.messages.map((msg) => (
                  <ChatBubble key={msg.id} role={msg.role} content={msg.content} />
                ))
              )}
              {streaming && <StreamingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="border-t border-border px-4 py-3">
            <div className="mx-auto flex max-w-[52.8rem] items-end gap-2 rounded-xl border border-border bg-card p-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message…"
                className="min-h-[40px] max-h-32 flex-1 resize-none border-0 shadow-none focus-visible:ring-0"
                rows={1}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || loading || streaming}
                    className="shrink-0 rounded-lg"
                    aria-label="Send message"
                  >
                    <Send className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

    </TooltipProvider>
  )
}
