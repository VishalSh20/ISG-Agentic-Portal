import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Undo2, FilePlus, PanelRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
} from '@/components/ui/resizable'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  uploadXml,
  addMessage,
  startNewSession,
  setStreaming,
  clearActivities,
  setXmlContent,
  updateXmlContent,
} from '@/store/slices/xmlAssistSlice'
import { useXmlAssistSocket } from '@/hooks/useXmlAssistSocket'
import { downloadXml } from '@/api/xmlAssist'
import FileUploadZone from '@/components/xml-assist/FileUploadZone'
import ChatMessages from '@/components/xml-assist/ChatMessages'
import ArtifactPane from '@/components/xml-assist/ArtifactPane'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { PanelImperativeHandle } from 'react-resizable-panels'

export default function XmlAssist() {
  const dispatch = useAppDispatch()
  const sessions = useAppSelector((s) => s.xmlAssist.sessions)
  const activeSessionId = useAppSelector((s) => s.xmlAssist.activeSessionId)
  const messages = useAppSelector((s) => (activeSessionId ? s.xmlAssist.messages?.[activeSessionId] ?? [] : []))
  const activities = useAppSelector((s) => (activeSessionId ? s.xmlAssist.activities?.[activeSessionId] ?? [] : []))
  const changeHistory = useAppSelector((s) => (activeSessionId ? s.xmlAssist.changeHistory?.[activeSessionId] ?? [] : []))
  const uploading = useAppSelector((s) => s.xmlAssist.uploading)
  const streaming = useAppSelector((s) => s.xmlAssist.streaming)

  const storedXmlContent = useAppSelector((s) => (activeSessionId ? s.xmlAssist.xmlContent?.[activeSessionId] : undefined))

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null

  // Local XML DOM
  const xmlDocRef = useRef<Document | null>(null)
  const [xmlVersion, setXmlVersion] = useState(0)
  const [highlightedPaths, setHighlightedPaths] = useState<Set<string>>(new Set())

  // Restore XML DOM from persisted content on mount or session switch
  const prevSessionRef = useRef<string | null>(null)
  useEffect(() => {
    // Clear DOM when switching sessions
    if (activeSessionId !== prevSessionRef.current) {
      xmlDocRef.current = null
      prevSessionRef.current = activeSessionId
    }

    if (activeSessionId && storedXmlContent && !xmlDocRef.current) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(storedXmlContent, 'text/xml')
      if (!doc.querySelector('parsererror')) {
        xmlDocRef.current = doc
        setXmlVersion((v) => v + 1)
      }
    }
    if (!activeSessionId) {
      xmlDocRef.current = null
    }
  }, [activeSessionId, storedXmlContent])

  // Chat input
  const [input, setInput] = useState('')

  // Artifact pane
  const artifactPanelRef = useRef<PanelImperativeHandle>(null)
  const [artifactCollapsed, setArtifactCollapsed] = useState(false)

  // Bump version + persist updated XML to store
  const onXmlChange = useCallback(() => {
    setXmlVersion((v) => v + 1)
    if (activeSessionId && xmlDocRef.current) {
      const serializer = new XMLSerializer()
      const xml = serializer.serializeToString(xmlDocRef.current)
      dispatch(updateXmlContent({ sessionId: activeSessionId, content: xml }))
    }
  }, [activeSessionId, dispatch])

  // WebSocket hook
  const { sendChat, sendUndo, isConnected } = useXmlAssistSocket({
    sessionId: activeSessionId,
    xmlDocRef,
    dispatch,
    onXmlChange,
  })

  /* ── File upload ── */
  const handleFileSelected = async (file: File) => {
    try {
      // Parse locally
      const text = await file.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/xml')
      const parseError = doc.querySelector('parsererror')
      if (parseError) {
        toast.error('Invalid XML file')
        return
      }
      xmlDocRef.current = doc
      setXmlVersion(0)

      // Upload to backend
      const session = await dispatch(uploadXml(file)).unwrap()

      // Persist raw XML to slice for reload survival
      dispatch(setXmlContent({ sessionId: session.id, content: text }))
      toast.success(`Loaded ${file.name}`)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload file')
    }
  }

  /* ── Send message ── */
  const handleSend = () => {
    const query = input.trim()
    if (!query || !activeSessionId) return

    // Add user message to store
    dispatch(addMessage({
      sessionId: activeSessionId,
      message: {
        id: crypto.randomUUID(),
        role: 'user',
        content: query,
        timestamp: new Date().toISOString(),
      },
    }))

    dispatch(clearActivities(activeSessionId))
    dispatch(setStreaming(true))
    setInput('')
    sendChat(query)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* ── Undo ── */
  const handleUndo = () => {
    if (!activeSessionId || changeHistory.length === 0) return
    dispatch(setStreaming(true))
    sendUndo()
  }

  /* ── New session ── */
  const handleNewSession = () => {
    xmlDocRef.current = null
    setXmlVersion(0)
    setHighlightedPaths(new Set())
    dispatch(startNewSession())
  }

  /* ── Download ── */
  const handleDownload = () => {
    if (xmlDocRef.current && activeSession) {
      downloadXml(xmlDocRef.current, activeSession.filename)
    }
  }

  /* ── Collapse / expand artifact pane ── */
  const toggleArtifact = () => {
    const panel = artifactPanelRef.current
    if (!panel) return
    if (artifactCollapsed) {
      panel.expand()
    } else {
      panel.collapse()
    }
    setArtifactCollapsed(!artifactCollapsed)
  }

  /* ── No session: show upload zone ── */
  if (!activeSessionId) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="flex h-full flex-col">
          <FileUploadZone onFileSelected={handleFileSelected} uploading={uploading} />
        </div>
      </TooltipProvider>
    )
  }

  /* ── Active session: chat + artifact pane ── */
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col">
        {/* ── Session header bar ── */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-2 shrink-0">
          <h2 className="text-sm font-semibold text-foreground truncate">
            {activeSession?.displayName}
          </h2>

          <div className="flex-1" />

          {/* Actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={changeHistory.length === 0 || streaming}
                className="text-xs gap-1.5"
              >
                <Undo2 className="size-3.5" />
                Undo
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo last change</TooltipContent>
          </Tooltip>

          {artifactCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={toggleArtifact} className="text-xs gap-1.5">
                  <PanelRight className="size-3.5" />
                  Artifact
                </Button>
              </TooltipTrigger>
              <TooltipContent>Show artifact panel</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleNewSession} className="text-xs gap-1.5">
                <FilePlus className="size-3.5" />
                New File
              </Button>
            </TooltipTrigger>
            <TooltipContent>Upload a new XML file</TooltipContent>
          </Tooltip>
        </div>

        {/* ── Main content: resizable chat + artifact ── */}
        <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
          {/* Chat panel */}
          <ResizablePanel defaultSize={60} minSize={35}>
            <div className="flex flex-col h-full">
              {/* Messages */}
              <ChatMessages messages={messages} activities={activities} streaming={streaming} />

              {/* Input area */}
              <div className="border-t border-border px-4 py-3 shrink-0">
                <div className="mx-auto flex max-w-[52.8rem] items-end gap-2 rounded-xl border border-border bg-card p-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about or modify your XML..."
                    className="min-h-[40px] max-h-32 flex-1 resize-none border-0 shadow-none focus-visible:ring-0"
                    rows={1}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!input.trim() || streaming}
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
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Artifact panel */}
          <ResizablePanel
            panelRef={artifactPanelRef}
            defaultSize={40}
            minSize={20}
            collapsible
            collapsedSize={0}
            onResize={(panelSize) => setArtifactCollapsed(panelSize.asPercentage === 0)}
          >
            <ArtifactPane
              xmlDoc={xmlDocRef.current}
              xmlVersion={xmlVersion}
              sessionVersion={activeSession?.version ?? 0}
              highlightedPaths={highlightedPaths}
              changeHistory={changeHistory}
              onCollapse={toggleArtifact}
              onDownload={handleDownload}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </TooltipProvider>
  )
}
