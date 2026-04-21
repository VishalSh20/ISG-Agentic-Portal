import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { XmlChangeEvent } from '@/types/xmlAssist'

const OP_COLORS: Record<string, string> = {
  add_element: 'bg-green-500/15 text-green-700 dark:text-green-400',
  delete_element: 'bg-red-500/15 text-red-700 dark:text-red-400',
  update_text: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  update_attribute: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  delete_attribute: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
}

const OP_LABELS: Record<string, string> = {
  add_element: 'Added',
  delete_element: 'Deleted',
  update_text: 'Updated Text',
  update_attribute: 'Updated Attr',
  delete_attribute: 'Deleted Attr',
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

function getChangeSummary(event: XmlChangeEvent): string {
  if (event.operation === 'update_text' && event.before?.[0]?.text && event.after?.[0]?.text) {
    return `${event.before[0].text} → ${event.after[0].text}`
  }
  if (event.operation === 'update_attribute' && event.before?.[0] && event.after?.[0]) {
    return `@${event.after[0].attr}: ${event.before[0].value} → ${event.after[0].value}`
  }
  return `${event.affected_count} element${event.affected_count !== 1 ? 's' : ''} affected`
}

interface ChangeHistoryTimelineProps {
  events: XmlChangeEvent[]
}

export default function ChangeHistoryTimeline({ events }: ChangeHistoryTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
        No changes yet. Start chatting to modify your XML.
      </div>
    )
  }

  // Show newest first
  const reversed = [...events].reverse()

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-1">
        {reversed.map((event, i) => (
          <div key={event.version}>
            <div className="rounded-lg p-3 space-y-2 hover:bg-accent/30 transition-colors">
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono px-1.5">
                    v{event.version}
                  </Badge>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${OP_COLORS[event.operation] || 'bg-muted text-muted-foreground'}`}
                  >
                    {OP_LABELS[event.operation] || event.operation}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
              </div>

              {/* User query */}
              <p className="text-sm text-foreground/80 italic">"{event.nl_query}"</p>

              {/* XPath */}
              <p className="text-xs font-mono text-muted-foreground truncate" title={event.xpath}>
                {event.xpath}
              </p>

              {/* Change summary */}
              <p className="text-xs text-muted-foreground">{getChangeSummary(event)}</p>
            </div>
            {i < reversed.length - 1 && <Separator className="my-1" />}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
