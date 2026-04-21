import { useState, memo } from 'react'
import { ChevronRight, ChevronDown, Tag } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

/* ── Get an XPath string for a DOM node ── */
function getNodeXPath(node: Node): string {
  const parts: string[] = []
  let current: Node | null = node
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const el = current as Element
    let index = 1
    let sibling = el.previousElementSibling
    while (sibling) {
      if (sibling.tagName === el.tagName) index++
      sibling = sibling.previousElementSibling
    }
    const hasSameTagSiblings =
      el.parentNode &&
      Array.from((el.parentNode as Element).children || []).filter((c) => c.tagName === el.tagName).length > 1
    const part = hasSameTagSiblings ? `${el.tagName}[${index}]` : el.tagName
    parts.unshift(part)
    current = current.parentNode
  }
  return '/' + parts.join('/')
}

/* ── Collect direct text from a node ── */
function getDirectText(node: Element): string {
  return Array.from(node.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent?.trim() || '')
    .filter(Boolean)
    .join(' ')
}

/* ── Inline attribute display ── */
function getInlineAttrs(el: Element): { key: string; value: string }[] {
  const attrs = Array.from(el.attributes)
  if (attrs.length === 0) return []
  // For elements with few attributes (<=3), show all inline
  if (attrs.length <= 3) {
    return attrs.map((a) => ({ key: a.name, value: a.value }))
  }
  // For elements with many attributes, show first key attr as hint
  const keyAttrs = ['id', 'name', 'type', 'key']
  for (const k of keyAttrs) {
    const val = el.getAttribute(k)
    if (val) return [{ key: k, value: val }]
  }
  // Fallback: show first attribute
  return [{ key: attrs[0].name, value: attrs[0].value }]
}

/* ── All attributes panel ── */
function AttributePanel({ node }: { node: Element }) {
  const attrs = Array.from(node.attributes)
  if (attrs.length === 0) return null

  return (
    <div className="ml-9 mb-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs font-mono space-y-0.5">
      {attrs.map((attr) => (
        <div key={attr.name} className="flex gap-1.5">
          <span className="text-purple-600 dark:text-purple-400 shrink-0">{attr.name}</span>
          <span className="text-muted-foreground">=</span>
          <span className="text-green-600 dark:text-green-400 break-all">"{attr.value}"</span>
        </div>
      ))}
    </div>
  )
}

/* ── Recursive XML node ── */
interface XmlNodeProps {
  node: Element
  depth: number
  defaultExpanded: boolean
  highlightedPaths: Set<string>
}

const XmlNode = memo(function XmlNode({ node, depth, defaultExpanded, highlightedPaths }: XmlNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [showAttrs, setShowAttrs] = useState(false)
  const xpath = getNodeXPath(node)
  const hasChildren = node.children.length > 0
  const directText = getDirectText(node)
  const isHighlighted = highlightedPaths.has(xpath) ||
    Array.from(highlightedPaths).some((p) => p.startsWith(xpath + '/'))
  const hasAttributes = node.attributes.length > 0
  const inlineAttrs = getInlineAttrs(node)
  const isLeaf = !hasChildren && directText

  const handleRowClick = () => {
    if (hasChildren) {
      setExpanded(!expanded)
    }
  }

  const handleAttrClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowAttrs(!showAttrs)
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={(e) => e.key === 'Enter' && handleRowClick()}
        className={cn(
          'flex items-center gap-1 w-full text-left py-0.5 px-1 rounded-sm text-sm font-mono transition-colors',
          'hover:bg-accent/50',
          hasChildren ? 'cursor-pointer' : 'cursor-default',
          isHighlighted && 'bg-yellow-500/15 ring-1 ring-yellow-500/30',
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        <span className="text-primary font-medium">{node.tagName}</span>

        {/* Inline attributes */}
        {inlineAttrs.length > 0 && (
          <span className="text-xs truncate">
            {inlineAttrs.map((a, i) => (
              <span key={a.key}>
                {i > 0 && <span className="text-muted-foreground/40">, </span>}
                <span className="text-purple-600 dark:text-purple-400">{a.key}</span>
                <span className="text-muted-foreground">=</span>
                <span className="text-green-600 dark:text-green-400">"{a.value.length > 24 ? a.value.slice(0, 24) + '...' : a.value}"</span>
              </span>
            ))}
          </span>
        )}

        {/* Click to expand all attributes (only show when there are more than shown inline) */}
        {hasAttributes && node.attributes.length > inlineAttrs.length && (
          <button
            type="button"
            onClick={handleAttrClick}
            className={cn(
              'ml-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[0.65rem] transition-colors',
              showAttrs
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent',
            )}
            title="Show all attributes"
          >
            <Tag className="size-2.5" />
            <span>+{node.attributes.length - inlineAttrs.length}</span>
          </button>
        )}

        {isLeaf && (
          <span className="text-foreground/80 ml-1 truncate">
            : <span className="text-green-600 dark:text-green-400">"{directText}"</span>
          </span>
        )}

        {hasChildren && !expanded && (
          <span className="text-muted-foreground/60 text-xs ml-1">
            ({node.children.length} children)
          </span>
        )}
      </div>

      {/* Expanded attributes panel */}
      {showAttrs && <AttributePanel node={node} />}

      {expanded &&
        hasChildren &&
        Array.from(node.children).map((child, i) => (
          <XmlNode
            key={`${child.tagName}-${i}`}
            node={child}
            depth={depth + 1}
            defaultExpanded={depth < 1}
            highlightedPaths={highlightedPaths}
          />
        ))}
    </div>
  )
})

/* ── Main tree view ── */
interface XmlTreeViewProps {
  xmlDoc: Document | null
  xmlVersion: number
  highlightedPaths: Set<string>
}

export default function XmlTreeView({ xmlDoc, xmlVersion, highlightedPaths }: XmlTreeViewProps) {
  if (!xmlDoc?.documentElement) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No XML loaded
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3" key={xmlVersion}>
        <XmlNode
          node={xmlDoc.documentElement}
          depth={0}
          defaultExpanded={true}
          highlightedPaths={highlightedPaths}
        />
      </div>
    </ScrollArea>
  )
}
