import { useState, useRef, useEffect } from 'react'
import { Send, Plus, Trash2, MessageSquare, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAppDispatch, useAppSelector } from '@/store'
import { createThread, sendMessageStream, switchThread, deleteThread } from '@/store/slices/chatSlice'
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
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card border border-border',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
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

  const [selectedWorkflow, setSelectedWorkflow] = useState(userPrefs?.defaultWorkflowId || '')
  const [selectedAgent, setSelectedAgent] = useState<string>(userPrefs?.defaultAgentId || ORCHESTRATOR_AGENT_ID)
  const [input, setInput] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  /* auto-scroll on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages.length, loading, streaming])

  /* sync agent selection when switching threads */
  useEffect(() => {
    if (activeThread?.agentId) {
      setSelectedAgent(activeThread.agentId)
    }
  }, [activeThread?.id])

  /* sync default workflow from prefs */
  useEffect(() => {
    if (userPrefs?.defaultWorkflowId && !selectedWorkflow) {
      setSelectedWorkflow(userPrefs.defaultWorkflowId)
    }
  }, [userPrefs?.defaultWorkflowId])

  const handleSend = async () => {
    const query = input.trim()
    if (!query) return
    try {
      if (!activeThread) {
        await dispatch(createThread({ agentId: selectedAgent, workflowId: selectedWorkflow || undefined })).unwrap()
      }
      setInput('')
      await dispatch(sendMessageStream({ query, agentId: selectedAgent, workflowId: selectedWorkflow || undefined })).unwrap()
    } catch {
      toast.error('Failed to send message. Please try again.')
    }
  }

  const handleNewThread = async () => {
    await dispatch(createThread({ agentId: selectedAgent, workflowId: selectedWorkflow || undefined })).unwrap()
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
        {/* ── Thread sidebar ── */}
        <aside className="hidden md:flex min-w-64 shrink-0 flex-col border-r border-border bg-sidebar sticky top-0">
          {/* New chat button */}
          <div className="p-3">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={handleNewThread}>
              <Plus className="size-4" />
              New Chat
            </Button>
          </div>

          <Separator />

          {/* Thread list */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {threads.map((t) => (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') dispatch(switchThread(t.id)) }}
                  onClick={() => dispatch(switchThread(t.id))}
                  className={cn(
                    'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors',
                    t.id === activeThreadId
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <MessageSquare className="size-3.5 shrink-0" />
                  <span className="flex-1 truncate">{t.title}</span>
                  <span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          aria-label={`Delete chat: ${t.title}`}
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(t.id) }}
                          className="rounded p-0.5 hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left">Delete</TooltipContent>
                    </Tooltip>
                  </span>
                </div>
              ))}

              {threads.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">No conversations yet</p>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Footer */}
          <div className="p-3">
            <p className="text-xs text-muted-foreground">
              Agent: {AGENT_OPTIONS.find((a) => a.id === selectedAgent)?.label ?? selectedAgent}
            </p>
          </div>
        </aside>

        {/* ── Chat area ── */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Toolbar: agent + workflow selectors */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-2">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Agent" />
              </SelectTrigger>
              <SelectContent>
                {AGENT_OPTIONS.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>{agent.label}</SelectItem>
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
          <ScrollArea className="flex-1 overflow-y-scroll">
            <div className="mx-auto max-w-3xl space-y-6 p-6">
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
            <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-border bg-card p-2">
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

      {/* ── Delete confirmation dialog ── */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>This conversation will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId) dispatch(deleteThread(deleteConfirmId))
                setDeleteConfirmId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
