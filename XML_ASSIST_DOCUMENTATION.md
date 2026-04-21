# XML Assist — Feature Documentation

## Overview

XML Assist is an AI-powered XML editor embedded within the ISG Portal. Users upload an XML file, then interact with a chat-based AI agent over WebSocket to query, understand, and modify the document in natural language. All mutations are applied in real-time to a local DOM, tracked with full undo history, and visualised across three artifact views (raw XML, interactive tree graph, change timeline).

---

## Features

| Feature | Description |
|---|---|
| **XML Upload** | Drag-and-drop or file picker for `.xml` files. Parsed client-side with `DOMParser` and uploaded to the backend via `POST /sessions`. |
| **Natural Language Chat** | Users type queries/instructions in plain English. Sent over WebSocket to the backend agent. |
| **Real-time XML Mutation** | The backend returns structured `change_event` messages; the frontend applies them to the in-memory DOM via XPath evaluation — no full-document reload. |
| **Undo** | One-click undo reverts the last change event on both client DOM and backend state. Sent as `{ action: "undo" }` over the WebSocket. |
| **Three Artifact Views** | **XML** (syntax-highlighted source), **Graph** (collapsible tree), **Updates** (change history timeline). Tabs are force-mounted so switching is instant. |
| **Session Management** | Multiple sessions supported. Each session has its own message history, activity log, change history, and persisted XML content. |
| **Tool Activity Feed** | Real-time display of backend agent tool calls (start/result/error) interleaved chronologically with chat messages. |
| **XML Download** | Serialises the current DOM state and downloads it as an `.xml` file with the original filename. |
| **Persistence** | Redux state (sessions, messages, change history, raw XML content) is persisted to `localStorage` via `redux-persist`, surviving page reloads. |
| **WebSocket Reconnection** | Auto-reconnects on disconnect with exponential backoff (up to 3 retries). |

---

## UI Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│  XmlAssist Page                                                      │
│                                                                      │
│  ┌──── No active session ─────────────────────────────────────────┐  │
│  │                                                                │  │
│  │              FileUploadZone                                    │  │
│  │        (drag-and-drop / click to browse)                       │  │
│  │              Accepts .xml only                                 │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──── Active session ────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  ┌─ Session Header Bar ─────────────────────────────────────┐  │  │
│  │  │  [File Display Name]          [Undo] [Artifact] [New]    │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌─ ResizablePanelGroup (horizontal) ───────────────────────┐  │  │
│  │  │                          │                                │  │  │
│  │  │    Chat Panel (60%)      │ ║  Artifact Panel (40%)        │  │  │
│  │  │                          │ ║                               │  │  │
│  │  │  ┌─ ChatMessages ─────┐  │ ║  ┌─ ArtifactPane ────────┐  │  │  │
│  │  │  │                    │  │ ║  │  [XML] [Graph] [Updates]│  │  │  │
│  │  │  │  Chat bubbles      │  │ ║  │  [Download] [Collapse] │  │  │  │
│  │  │  │  + Activity items  │  │ ║  │                        │  │  │  │
│  │  │  │  (interleaved by   │  │ ║  │  Active tab content:   │  │  │  │
│  │  │  │   timestamp)       │  │ ║  │  - XmlCodeView         │  │  │  │
│  │  │  │                    │  │ ║  │  - XmlTreeView          │  │  │  │
│  │  │  │  Streaming dot...  │  │ ║  │  - ChangeHistoryTimeline│  │  │  │
│  │  │  └────────────────────┘  │ ║  └────────────────────────┘  │  │  │
│  │  │                          │ ║                               │  │  │
│  │  │  ┌─ Input Area ───────┐  │ ║  (collapsible to 0%)         │  │  │
│  │  │  │  [Textarea] [Send] │  │ ║                               │  │  │
│  │  │  └────────────────────┘  │                                │  │  │
│  │  └──────────────────────────┴────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | File | Role |
|---|---|---|
| `XmlAssist` | `src/pages/XmlAssist.tsx` | Page-level orchestrator. Manages local XML DOM ref, WebSocket hook, file upload, session state, and layout via `ResizablePanelGroup`. |
| `FileUploadZone` | `src/components/xml-assist/FileUploadZone.tsx` | Full-screen drag-and-drop upload zone shown when no session is active. Validates `.xml` extension. |
| `ChatMessages` | `src/components/xml-assist/ChatMessages.tsx` | Renders a merged, timestamp-sorted timeline of chat messages and tool activity indicators. Auto-scrolls on new content. Assistant messages rendered as Markdown via `react-markdown`. |
| `ArtifactPane` | `src/components/xml-assist/ArtifactPane.tsx` | Tabbed panel with three views. Uses Radix `Tabs` with `forceMount` + `data-[state=inactive]:hidden` so tab switches don't remount content. |
| `XmlCodeView` | `src/components/xml-assist/ArtifactPane.tsx` (inline) | Syntax-highlighted XML source. Serialises DOM → formats with indentation → highlights via regex-based HTML spans. Output is `useMemo`-cached on `[xmlDoc, xmlVersion]`. |
| `XmlTreeView` | `src/components/xml-assist/XmlTreeView.tsx` | Interactive collapsible tree of the XML DOM. Each `XmlNode` is `memo`-ised and shows tag name, inline attributes, direct text, child count. Highlighted paths (from change events) get a yellow ring. |
| `ChangeHistoryTimeline` | `src/components/xml-assist/ChangeHistoryTimeline.tsx` | Newest-first list of all change events. Each entry shows version badge, operation type (colour-coded), original natural language query, XPath, and a before→after summary. |

---

## Data Flow & Working

### 1. Upload Flow

```
User drops .xml file
  → FileUploadZone.handleFile()
    → DOMParser.parseFromString() — client-side validation
    → dispatch(uploadXml(file)) — async thunk
      → POST /sessions (FormData) — backend creates session
      → Returns { session_id, schema, version }
    → Redux: session added, activeSessionId set, xmlContent persisted
    → xmlDocRef.current = parsed DOM
```

### 2. Chat / Mutation Flow (WebSocket)

```
User types message → handleSend()
  → dispatch(addMessage()) — user message to Redux
  → dispatch(clearActivities()) — clear previous tool indicators
  → dispatch(setStreaming(true))
  → ws.send({ action: "chat", query })

Backend processes and sends events over WebSocket:

  ┌─ "tool_start"    → addActivity({ status: "pending" })
  ├─ "tool_result"   → addActivity({ status: "done" | "failed" })
  ├─ "change_event"  → applyChangeToLocalXML(dom, change)
  │                    → dispatch(addChangeEntry())
  │                    → onXmlChange() — bumps version, persists XML
  ├─ "agent_reply"   → addMessage({ role: "assistant" })
  │                    → setStreaming(false)
  └─ "error"         → addActivity({ status: "failed" })
                       → setStreaming(false)
```

### 3. Local DOM Mutation Engine (`useXmlAssistSocket.ts`)

The `applyChangeToLocalXML()` function handles five operation types by evaluating XPath expressions against the in-memory DOM:

| Operation | Action |
|---|---|
| `update_text` | Sets `textContent` on matched nodes |
| `update_attribute` | Calls `setAttribute()` on matched elements |
| `delete_attribute` | Calls `removeAttribute()` on matched elements |
| `add_element` | Creates new element via `createElement()`, sets text/attributes, appends to parent |
| `delete_element` | Removes matched nodes via `removeChild()` |

### 4. Undo Flow

```
User clicks Undo
  → ws.send({ action: "undo" })
  → Backend responds with "undo_result" containing reverted_event
  → revertChangeFromLocalXML(dom, event) — inverse of apply
  → dispatch(removeLastChangeEntry()) — pops from history
```

Revert logic maps each operation to its inverse:
- `update_text` / `update_attribute` → reapply with `before` as `after`
- `delete_attribute` → re-set the attribute from `before`
- `add_element` → delete the added elements
- `delete_element` → re-add the deleted elements

### 5. Artifact Rendering

All three artifact tabs are force-mounted (stay in DOM at all times). Switching tabs toggles CSS `hidden` — zero re-rendering cost.

- **XML tab**: `useMemo` recomputes highlighted HTML only when `xmlVersion` changes. Regex-based syntax highlighting colours tags, attributes, and values.
- **Graph tab**: Recursive `XmlNode` components (each `memo`-ised). Nodes auto-expand to depth 1. Attributes shown inline (up to 3) or in an expandable panel. Highlighted XPaths (from recent changes) get a yellow ring indicator.
- **Updates tab**: Reverse-chronological list. Each entry is colour-coded by operation type (green = add, red = delete, yellow = update, orange = delete attr).

---

## State Shape (`xmlAssistSlice`)

```typescript
{
  sessions: XmlAssistSession[]         // All uploaded sessions
  activeSessionId: string | null       // Currently viewed session
  messages: Record<sessionId, Message[]>    // Chat history per session
  activities: Record<sessionId, Activity[]> // Tool call indicators per session
  changeHistory: Record<sessionId, ChangeEvent[]> // Mutation log per session
  xmlContent: Record<sessionId, string>     // Raw XML string per session (for reload survival)
  uploading: boolean                   // Upload in progress
  streaming: boolean                   // Agent is processing
  error: string | null                 // Last error
}
```

Persisted to `localStorage` via `redux-persist` (whitelisted alongside `auth`, `theme`, `chat`).

---

## API Layer (`src/api/xmlAssist.ts`)

| Endpoint | Method | Purpose |
|---|---|---|
| `POST /sessions` | REST | Upload XML file, returns `session_id`, `schema`, `version` |
| `POST /sessions/:id/undo` | REST | Undo last change on server |
| `GET /sessions/:id/history` | REST | Fetch full change history |
| `DELETE /sessions/:id` | REST | Delete session |
| `WS /sessions/:id/ws` | WebSocket | Bidirectional chat + real-time events |

Base URL configured via `VITE_XML_AGENT_URL` (defaults to `http://localhost:8000`).

---

## Route

```
/xml-assist → <XmlAssist />
```

Rendered inside the main `AppShell` layout. Accessible from the sidebar navigation.
