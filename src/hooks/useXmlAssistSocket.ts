import { useRef, useEffect, useCallback, useState } from 'react'
import { getWebSocketUrl } from '@/api/xmlAssist'
import {
  addMessage,
  addActivity,
  updateActivityStatus,
  addChangeEntry,
  removeLastChangeEntry,
  setStreaming,
} from '@/store/slices/xmlAssistSlice'
import type { XmlChangeEvent } from '@/types/xmlAssist'
import type { AppDispatch } from '@/store'

function uid() {
  return crypto.randomUUID()
}

/** Apply a ChangeEvent to the local XML DOM */
function applyChangeToLocalXML(xmlDoc: Document, change: XmlChangeEvent) {
  const evalXPath = (xpath: string) => {
    const result = xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
    const nodes: Node[] = []
    for (let i = 0; i < result.snapshotLength; i++) nodes.push(result.snapshotItem(i)!)
    return nodes
  }

  switch (change.operation) {
    case 'update_text': {
      if (!change.after) break
      for (const item of change.after) {
        const nodes = evalXPath(item.path)
        for (const node of nodes) node.textContent = item.text ?? ''
      }
      break
    }
    case 'update_attribute': {
      if (!change.after) break
      for (const item of change.after) {
        const nodes = evalXPath(item.path)
        for (const node of nodes) (node as Element).setAttribute(item.attr!, item.value!)
      }
      break
    }
    case 'delete_attribute': {
      if (!change.before) break
      for (const item of change.before) {
        const nodes = evalXPath(item.path)
        for (const node of nodes) (node as Element).removeAttribute(item.attr!)
      }
      break
    }
    case 'add_element': {
      if (!change.after) break
      for (const item of change.after) {
        const parentPath = item.path.replace(/\/[^/]+$/, '')
        const parents = evalXPath(parentPath)
        for (const parent of parents) {
          const newElem = xmlDoc.createElement(item.tag!)
          if (item.text) newElem.textContent = item.text
          if (item.attributes) {
            for (const [k, v] of Object.entries(item.attributes)) newElem.setAttribute(k, v)
          }
          parent.appendChild(newElem)
        }
      }
      break
    }
    case 'delete_element': {
      if (!change.before) break
      for (const item of change.before) {
        const nodes = evalXPath(item.path)
        for (const node of nodes) node.parentNode?.removeChild(node)
      }
      break
    }
  }
}

/** Revert a ChangeEvent on the local XML DOM */
function revertChangeFromLocalXML(xmlDoc: Document, change: XmlChangeEvent) {
  switch (change.operation) {
    case 'update_text':
    case 'update_attribute':
      applyChangeToLocalXML(xmlDoc, { ...change, after: change.before })
      break
    case 'delete_attribute':
      if (change.before) {
        for (const item of change.before) {
          const result = xmlDoc.evaluate(item.path, xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
          for (let i = 0; i < result.snapshotLength; i++) {
            (result.snapshotItem(i) as Element).setAttribute(item.attr!, item.value!)
          }
        }
      }
      break
    case 'add_element':
      applyChangeToLocalXML(xmlDoc, { ...change, operation: 'delete_element', before: change.after })
      break
    case 'delete_element':
      applyChangeToLocalXML(xmlDoc, { ...change, operation: 'add_element', after: change.before })
      break
  }
}

interface UseXmlAssistSocketOptions {
  sessionId: string | null
  xmlDocRef: React.MutableRefObject<Document | null>
  dispatch: AppDispatch
  onXmlChange: () => void
}

export function useXmlAssistSocket({ sessionId, xmlDocRef, dispatch, onXmlChange }: UseXmlAssistSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const retriesRef = useRef(0)
  const maxRetries = 3

  const connect = useCallback(() => {
    if (!sessionId) return

    const ws = new WebSocket(getWebSocketUrl(sessionId))
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      retriesRef.current = 0
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      switch (msg.type) {
        case 'tool_start': {
          const activityId = uid()
          dispatch(addActivity({
            sessionId,
            activity: {
              id: activityId,
              type: 'tool_start',
              toolName: msg.payload?.tool_name,
              summary: `Calling ${msg.payload?.tool_name}...`,
              status: 'pending',
              timestamp: new Date().toISOString(),
            },
          }))
          dispatch(setStreaming(true))
          break
        }

        case 'tool_result': {
          dispatch(addActivity({
            sessionId,
            activity: {
              id: uid(),
              type: 'tool_result',
              toolName: msg.payload?.tool_name,
              summary: `${msg.payload?.tool_name}: ${msg.payload?.success ? 'OK' : 'Failed'}`,
              status: msg.payload?.success ? 'done' : 'failed',
              timestamp: new Date().toISOString(),
            },
          }))
          break
        }

        case 'change_event': {
          const changeEvent = msg.payload as XmlChangeEvent
          if (xmlDocRef.current) {
            applyChangeToLocalXML(xmlDocRef.current, changeEvent)
            onXmlChange()
          }
          dispatch(addChangeEntry({ sessionId, entry: changeEvent }))
          break
        }

        case 'agent_reply': {
          dispatch(addMessage({
            sessionId,
            message: {
              id: uid(),
              role: 'assistant',
              content: msg.payload?.content || '',
              timestamp: new Date().toISOString(),
            },
          }))
          dispatch(setStreaming(false))
          break
        }

        case 'undo_result': {
          if (msg.payload?.reverted_event && xmlDocRef.current) {
            revertChangeFromLocalXML(xmlDocRef.current, msg.payload.reverted_event)
            onXmlChange()
            dispatch(removeLastChangeEntry(sessionId))
          }
          dispatch(setStreaming(false))
          break
        }

        case 'error': {
          dispatch(addActivity({
            sessionId,
            activity: {
              id: uid(),
              type: 'error',
              summary: msg.payload?.message || 'Unknown error',
              status: 'failed',
              timestamp: new Date().toISOString(),
            },
          }))
          dispatch(setStreaming(false))
          break
        }
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      // Auto-reconnect with backoff
      if (retriesRef.current < maxRetries) {
        const delay = Math.pow(2, retriesRef.current) * 1000
        retriesRef.current++
        setTimeout(() => connect(), delay)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [sessionId, dispatch, onXmlChange, xmlDocRef])

  useEffect(() => {
    connect()
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect on intentional close
        wsRef.current.close()
        wsRef.current = null
      }
      setIsConnected(false)
    }
  }, [connect])

  const sendChat = useCallback((query: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'chat', query }))
    }
  }, [])

  const sendUndo = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'undo' }))
    }
  }, [])

  return { sendChat, sendUndo, isConnected }
}
