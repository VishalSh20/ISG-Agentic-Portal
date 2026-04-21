import { useEffect, useRef, useMemo } from 'react'
import { Loader2, FileCode2, Wrench, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { XmlAssistMessage, XmlAssistActivity } from '@/types/xmlAssist'

/* ── Markdown renderers ── */
const markdownComponents = {
  a({ href, children }: { href?: string; children?: React.ReactNode }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
        {children}
      </a>
    )
  },
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <FileCode2 className="size-8 text-primary" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold text-foreground">XML file loaded</h2>
        <p className="text-sm text-muted-foreground">
          Ask a question about your XML or request changes
        </p>
      </div>
    </div>
  )
}

/* ── Chat bubble ── */
function ChatBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-5 py-3.5 text-[0.938rem] leading-relaxed',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border',
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

/* ── Activity item ── */
function ActivityItem({ activity }: { activity: XmlAssistActivity }) {
  const icon =
    activity.status === 'pending' ? (
      <Clock className="size-3 text-muted-foreground animate-pulse" />
    ) : activity.status === 'failed' || activity.type === 'error' ? (
      <AlertCircle className="size-3 text-destructive" />
    ) : (
      <CheckCircle2 className="size-3 text-green-500" />
    )

  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
        <Wrench className="size-3 text-muted-foreground" />
        {icon}
        <span className="text-xs text-muted-foreground">{activity.summary}</span>
        {activity.toolName && (
          <Badge variant="secondary" className="text-[0.65rem] px-1.5 py-0">
            {activity.toolName}
          </Badge>
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
        <span className="text-sm text-muted-foreground">Thinking...</span>
      </div>
    </div>
  )
}

/* ── Main component ── */
interface ChatMessagesProps {
  messages: XmlAssistMessage[]
  activities: XmlAssistActivity[]
  streaming: boolean
}

type TimelineItem =
  | { kind: 'message'; data: XmlAssistMessage }
  | { kind: 'activity'; data: XmlAssistActivity }

export default function ChatMessages({ messages, activities, streaming }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Merge messages and activities by timestamp
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...messages.map((m) => ({ kind: 'message' as const, data: m })),
      ...activities.map((a) => ({ kind: 'activity' as const, data: a })),
    ]
    items.sort((a, b) => new Date(a.data.timestamp).getTime() - new Date(b.data.timestamp).getTime())
    return items
  }, [messages, activities])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [timeline.length, streaming])

  return (
    <ScrollArea className="flex-1 overflow-y-scroll">
      <div className="mx-auto max-w-[56rem] space-y-4 p-6">
        {timeline.length === 0 ? (
          <EmptyState />
        ) : (
          timeline.map((item) =>
            item.kind === 'message' ? (
              <ChatBubble key={item.data.id} role={item.data.role} content={item.data.content} />
            ) : (
              <ActivityItem key={item.data.id} activity={item.data} />
            ),
          )
        )}
        {streaming && <StreamingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}
