import { useMemo } from 'react'
import { Download, PanelRightClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import XmlTreeView from './XmlTreeView'
import ChangeHistoryTimeline from './ChangeHistoryTimeline'
import type { XmlChangeEvent } from '@/types/xmlAssist'

/* ── XML code view with syntax highlighting via single innerHTML ── */
function XmlCodeView({ xmlDoc, xmlVersion }: { xmlDoc: Document | null; xmlVersion: number }) {
  const highlightedHtml = useMemo(() => {
    if (!xmlDoc) return ''
    const raw = new XMLSerializer().serializeToString(xmlDoc)
    const formatted = formatXml(raw)
    return highlightXmlToHtml(formatted)
  }, [xmlDoc, xmlVersion])

  if (!highlightedHtml) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No XML loaded
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <pre
        className="p-3 text-xs font-mono leading-relaxed whitespace-pre overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </ScrollArea>
  )
}

/** Simple XML indentation */
function formatXml(xml: string): string {
  let formatted = ''
  let indent = 0
  const parts = xml.replace(/>\s*</g, '>\n<').split('\n')
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1)
    formatted += '  '.repeat(indent) + trimmed + '\n'
    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.startsWith('<?')) {
      indent++
    }
  }
  return formatted.trimEnd()
}

/** Escape HTML entities */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Syntax highlight XML into a single HTML string (no React elements) */
function highlightXmlToHtml(xml: string): string {
  // Escape first, then wrap known patterns in spans
  const escaped = esc(xml)
  return escaped
    // Attribute name="value" pairs (must run before tag coloring)
    .replace(
      /([\w.:_-]+)(=)(&quot;)(.*?)(&quot;)/g,
      '<span class="xml-attr">$1</span><span class="xml-eq">$2</span><span class="xml-val">$3$4$5</span>',
    )
    // Tag names: <tagName and </tagName and />  and >
    .replace(
      /(&lt;\/?)([\w.:_-]+)/g,
      '<span class="xml-tag">$1$2</span>',
    )
    .replace(
      /(\/?&gt;)/g,
      '<span class="xml-tag">$1</span>',
    )
}

interface ArtifactPaneProps {
  xmlDoc: Document | null
  xmlVersion: number
  sessionVersion: number
  highlightedPaths: Set<string>
  changeHistory: XmlChangeEvent[]
  onCollapse: () => void
  onDownload: () => void
}

export default function ArtifactPane({
  xmlDoc,
  xmlVersion,
  sessionVersion,
  highlightedPaths,
  changeHistory,
  onCollapse,
  onDownload,
}: ArtifactPaneProps) {
  return (
    <Tabs defaultValue="graph" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2 shrink-0">
        <TabsList className="h-8">
          <TabsTrigger value="xml" className="text-xs px-3">
            XML
          </TabsTrigger>
          <TabsTrigger value="graph" className="text-xs px-3">
            Graph
          </TabsTrigger>
          <TabsTrigger value="updates" className="text-xs px-3">
            Updates
            {changeHistory.length > 0 && (
              <span className="ml-1.5 text-[0.6rem] bg-primary/15 text-primary rounded-full px-1.5">
                {changeHistory.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-xs" onClick={onDownload}>
                <Download className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download XML</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-xs" onClick={onCollapse}>
                <PanelRightClose className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Collapse panel</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <TabsContent forceMount value="xml" className="flex-1 min-h-0 mt-0 flex flex-col data-[state=inactive]:hidden">
        <div className="px-3 pt-2 shrink-0">
          <Badge variant="outline" className="text-xs font-mono">
            v{sessionVersion}
          </Badge>
        </div>
        <div className="flex-1 min-h-0">
          <XmlCodeView xmlDoc={xmlDoc} xmlVersion={xmlVersion} />
        </div>
      </TabsContent>
      <TabsContent forceMount value="graph" className="flex-1 min-h-0 mt-0 flex flex-col data-[state=inactive]:hidden">
        <div className="px-3 pt-2 shrink-0">
          <Badge variant="outline" className="text-xs font-mono">
            v{sessionVersion}
          </Badge>
        </div>
        <div className="flex-1 min-h-0">
          <XmlTreeView xmlDoc={xmlDoc} xmlVersion={xmlVersion} highlightedPaths={highlightedPaths} />
        </div>
      </TabsContent>
      <TabsContent forceMount value="updates" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
        <ChangeHistoryTimeline events={changeHistory} />
      </TabsContent>
    </Tabs>
  )
}
