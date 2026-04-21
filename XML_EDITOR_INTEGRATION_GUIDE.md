# Frontend Integration Guide — XML Agent API

This guide covers everything needed to integrate the XML Agent backend into a frontend application. It details every API endpoint, the WebSocket protocol, how to maintain a local XML copy, apply changes, render a live tree, and display real-time agent progress.

---

## Table of Contents

1. [Backend Setup](#1-backend-setup)
2. [Session Lifecycle](#2-session-lifecycle)
3. [Uploading an XML File](#3-uploading-an-xml-file)
4. [Maintaining the Local XML Copy](#4-maintaining-the-local-xml-copy)
5. [Chat via REST](#5-chat-via-rest)
6. [Chat via WebSocket (Live Streaming)](#6-chat-via-websocket-live-streaming)
7. [WebSocket Message Reference](#7-websocket-message-reference)
8. [Applying Change Events to Local XML](#8-applying-change-events-to-local-xml)
9. [Rendering the Live XML Tree](#9-rendering-the-live-xml-tree)
10. [Highlighting Changes in the Tree](#10-highlighting-changes-in-the-tree)
11. [Undo](#11-undo)
12. [Change History](#12-change-history)
13. [Saving to Disk](#13-saving-to-disk)
14. [Session Management](#14-session-management)
15. [Error Handling](#15-error-handling)
16. [Full Workflow Example](#16-full-workflow-example)

---

## 1. Backend Setup

Start the FastAPI server:

```bash
cd "xml editor"
source venv/Scripts/activate   # Windows Git Bash
uvicorn app.main:app --reload --port 8000
```

Base URL: `http://localhost:8000`  
WebSocket URL: `ws://localhost:8000`

All REST endpoints accept/return JSON. File upload uses `multipart/form-data`.

---

## 2. Session Lifecycle

Every interaction revolves around a **session**. A session is created when the user uploads an XML file and destroyed when no longer needed.

```
Upload XML  →  session created (get session_id)
    ↓
Chat / Undo / History  (using session_id)
    ↓
Delete session (cleanup)
```

The `session_id` is a UUID string. Store it in your app state after upload.

---

## 3. Uploading an XML File

### Endpoint

```
POST /sessions
Content-Type: multipart/form-data
```

### Request

Form field `file` — the XML file.

```javascript
async function uploadXML(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("http://localhost:8000/sessions", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}
```

### Response (201)

```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "schema": {
    "root": "Session.getElementXmlRs",
    "total_elements": 4521,
    "paths": {
      "/Session.getElementXmlRs/session/data/policy": {
        "tag": "policy",
        "attrs": { "id": ["pED4BFCAB2BBA4553B45D11AC5F9401E6"] },
        "has_text": false,
        "children": ["EffectiveDate", "ExpirationDate", "Status", "fee", "line", ...],
        "count": 1
      }
    }
  },
  "version": 0
}
```

**What to do with this response:**

1. Store `session_id` — needed for all subsequent API calls.
2. Store `version` — track it locally, compare with incoming change events.
3. Use `schema` to understand the XML structure (optional — the tree view uses the parsed XML directly).
4. **Parse the uploaded file locally** — the frontend must keep its own copy (see next section).

---

## 4. Maintaining the Local XML Copy

The backend never sends back the full XML. The frontend must:

1. Parse the uploaded file into a DOM at upload time.
2. Apply change events received from the backend to this local DOM.

### Parsing at Upload Time

```javascript
// When the user selects a file, read it AND upload it
const fileText = await file.text();
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(fileText, "text/xml");

// Store both
state.xmlDoc = xmlDoc;      // local mutable copy
state.sessionId = response.session_id;
state.version = 0;
```

### Why This Works

The backend and frontend start from the same XML bytes. Every mutation the backend makes is communicated as a structured `ChangeEvent` with enough detail for the frontend to replicate the change locally. They stay in sync via version numbers.

---

## 5. Chat via REST

Use this for simple request/response without live streaming.

### Endpoint

```
POST /sessions/{session_id}/chat
Content-Type: application/json
```

### Request

```json
{
  "query": "Change the effective date to 2026-01-01"
}
```

### Response (200)

```json
{
  "reply": "I've updated the EffectiveDate from 2025-03-24 to 2026-01-01.",
  "changes": [
    {
      "version": 1,
      "operation": "update_text",
      "xpath": "//policy/EffectiveDate",
      "before": [
        { "path": "/Session.getElementXmlRs/session/data/policy/EffectiveDate", "text": "2025-03-24" }
      ],
      "after": [
        { "path": "/Session.getElementXmlRs/session/data/policy/EffectiveDate", "text": "2026-01-01" }
      ],
      "affected_count": 1,
      "timestamp": "2026-04-10T12:00:00+00:00",
      "nl_query": "Change the effective date to 2026-01-01"
    }
  ],
  "current_version": 1
}
```

### Frontend Handling

```javascript
async function sendChat(sessionId, query) {
  const res = await fetch(`http://localhost:8000/sessions/${sessionId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();

  // 1. Display the reply in chat panel
  appendMessage("agent", data.reply);

  // 2. Apply each change to local XML
  for (const change of data.changes) {
    applyChangeToLocalXML(change);
    state.version = change.version;
  }

  // 3. Re-render tree
  renderTree();
}
```

---

## 6. Chat via WebSocket (Live Streaming)

This is the **recommended** approach. It shows the user what the agent is doing in real-time: which tools it's calling, what it's querying, what it's changing — step by step.

### Connecting

```javascript
function connectWebSocket(sessionId) {
  const ws = new WebSocket(`ws://localhost:8000/sessions/${sessionId}/ws`);

  ws.onopen = () => {
    console.log("WebSocket connected");
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleWSMessage(msg);
  };

  ws.onclose = (event) => {
    console.log("WebSocket closed:", event.code, event.reason);
  };

  return ws;
}
```

### Sending a Chat Message

```javascript
ws.send(JSON.stringify({
  action: "chat",
  query: "Add a new coverage for cyber liability under the GeneralLiability line"
}));
```

### Sending an Undo

```javascript
ws.send(JSON.stringify({ action: "undo" }));
```

### Handling Incoming Messages

```javascript
function handleWSMessage(msg) {
  switch (msg.type) {

    case "tool_start":
      // Agent is about to call a tool — show in activity feed
      // msg.payload = { tool_name: "query_elements", arguments: { xpath: "..." } }
      showActivity(`Calling ${msg.payload.tool_name}...`, "pending");
      break;

    case "tool_result":
      // Tool finished — update activity feed
      // msg.payload = { tool_name: "query_elements", result: {...}, success: true }
      showActivity(`${msg.payload.tool_name}: ${msg.payload.success ? "OK" : "FAILED"}`, "done");
      break;

    case "change_event":
      // A mutation happened — apply to local XML and highlight in tree
      // msg.payload = full ChangeEvent object
      // msg.version = new version number
      applyChangeToLocalXML(msg.payload);
      highlightChangedNodes(msg.payload);
      state.version = msg.version;
      addToChangeLog(msg.payload);
      break;

    case "agent_reply":
      // Final text response — show in chat
      // msg.payload = { content: "I've added the cyber liability coverage..." }
      appendMessage("agent", msg.payload.content);
      clearActivity();
      break;

    case "undo_result":
      // Undo completed
      // msg.payload = { result: { success: true }, reverted_event: { ChangeEvent } }
      // msg.version = new version number
      if (msg.payload.reverted_event) {
        revertChangeFromLocalXML(msg.payload.reverted_event);
        state.version = msg.version;
        renderTree();
      }
      break;

    case "error":
      // msg.payload = { message: "..." }
      showError(msg.payload.message);
      break;
  }
}
```

### What the User Sees (Timeline)

When the user asks "change the broker fee to 200", the WebSocket streams this sequence:

```
┌──────────────────────────────────────────────────────────┐
│ Activity Panel                                           │
│                                                          │
│  ⏳ Querying //policy/fee[@id='fA564...']...             │
│  ✅ query_elements: found 1 match                        │
│  ⏳ Updating Amount text...                              │
│  ✅ update_text: 1 element updated                       │
│  ⏳ Updating fValue text...                              │
│  ✅ update_text: 1 element updated                       │
│                                                          │
│ Chat Panel                                               │
│  Agent: I've updated the BrokerFee amount from 100 to    │
│  200 and updated the fValue accordingly.                 │
│                                                          │
│ Tree Panel                                               │
│  ▼ policy                                                │
│    ▼ fee [@id='fA564...']                                │
│      Amount: 200  ← highlighted yellow                   │
│      fValue: 200  ← highlighted yellow                   │
└──────────────────────────────────────────────────────────┘
```

---

## 7. WebSocket Message Reference

### Messages the Client Sends

| Action | Format | Description |
|--------|--------|-------------|
| Chat | `{"action": "chat", "query": "your question"}` | Send a natural language query |
| Undo | `{"action": "undo"}` | Undo last mutation |

### Messages the Server Sends

| Type | Payload | When |
|------|---------|------|
| `tool_start` | `{tool_name, arguments}` | Before each tool executes |
| `tool_result` | `{tool_name, result, success}` | After each tool completes |
| `change_event` | Full `ChangeEvent` (see below) | After each mutation (not for queries) |
| `agent_reply` | `{content}` | LLM's final text response |
| `undo_result` | `{result, reverted_event}` | After undo completes |
| `error` | `{message}` | On any error |

### ChangeEvent Shape

```typescript
interface ChangeEvent {
  version: number;          // monotonically increasing, never decreases
  operation: string;        // "add_element" | "delete_element" | "update_text" | "update_attribute" | "delete_attribute"
  xpath: string;            // XPath used for the operation
  before: object[] | null;  // state before mutation (null for add_element)
  after: object[] | null;   // state after mutation (null for delete_element, delete_attribute)
  affected_count: number;   // how many elements were affected
  timestamp: string;        // ISO 8601
  nl_query: string;         // the user's original question
}
```

**`before`/`after` shapes by operation:**

| Operation | `before` | `after` |
|-----------|----------|---------|
| `update_text` | `[{path, text}]` | `[{path, text}]` |
| `update_attribute` | `[{path, attr, value}]` | `[{path, attr, value}]` |
| `delete_attribute` | `[{path, attr, value}]` | `null` |
| `add_element` | `null` | `[{path, tag, text, attributes}]` |
| `delete_element` | `[{path, tag, text, attributes}]` | `null` |

The `path` field is a full absolute XPath like `/Session.getElementXmlRs/session/data/policy/fee[1]/Amount`.

---

## 8. Applying Change Events to Local XML

This is the core of the frontend sync mechanism. Use the browser's native XPath evaluation to find nodes and apply changes.

### Helper: Evaluate XPath on Local DOM

```javascript
function evaluateXPath(xmlDoc, xpath) {
  // The sample XML uses dotted tag names like "Session.getElementXmlRs"
  // Browser XPath handles these natively
  const result = xmlDoc.evaluate(
    xpath,
    xmlDoc,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  const nodes = [];
  for (let i = 0; i < result.snapshotLength; i++) {
    nodes.push(result.snapshotItem(i));
  }
  return nodes;
}
```

### Applying Each Operation

```javascript
function applyChangeToLocalXML(change) {
  const { operation, xpath, before, after } = change;

  switch (operation) {

    case "update_text": {
      // after = [{path, text}, ...]
      for (const item of after) {
        const nodes = evaluateXPath(state.xmlDoc, item.path);
        for (const node of nodes) {
          node.textContent = item.text;
        }
      }
      break;
    }

    case "update_attribute": {
      // after = [{path, attr, value}, ...]
      for (const item of after) {
        const nodes = evaluateXPath(state.xmlDoc, item.path);
        for (const node of nodes) {
          node.setAttribute(item.attr, item.value);
        }
      }
      break;
    }

    case "delete_attribute": {
      // before = [{path, attr, value}, ...]
      for (const item of before) {
        const nodes = evaluateXPath(state.xmlDoc, item.path);
        for (const node of nodes) {
          node.removeAttribute(item.attr);
        }
      }
      break;
    }

    case "add_element": {
      // after = [{path, tag, text, attributes}, ...]
      // path is the full path of the NEW element — parent is path minus last segment
      for (const item of after) {
        const parentPath = item.path.replace(/\/[^/]+$/, "");
        const parents = evaluateXPath(state.xmlDoc, parentPath);
        for (const parent of parents) {
          const newElem = state.xmlDoc.createElement(item.tag);
          if (item.text) newElem.textContent = item.text;
          if (item.attributes) {
            for (const [k, v] of Object.entries(item.attributes)) {
              newElem.setAttribute(k, v);
            }
          }
          parent.appendChild(newElem);
        }
      }
      break;
    }

    case "delete_element": {
      // before = [{path, tag, text, attributes}, ...]
      for (const item of before) {
        const nodes = evaluateXPath(state.xmlDoc, item.path);
        for (const node of nodes) {
          node.parentNode.removeChild(node);
        }
      }
      break;
    }
  }
}
```

### Reverting a Change (for Undo)

```javascript
function revertChangeFromLocalXML(change) {
  // Swap before/after and apply the inverse operation
  const inverse = {
    update_text: "update_text",
    update_attribute: "update_attribute",
    delete_attribute: "add_attribute",  // special case
    add_element: "delete_element",
    delete_element: "add_element",
  };

  switch (change.operation) {
    case "update_text":
    case "update_attribute":
      // Apply with before as the target state
      applyChangeToLocalXML({ ...change, after: change.before });
      break;

    case "delete_attribute":
      // Re-add the attribute
      for (const item of change.before) {
        const nodes = evaluateXPath(state.xmlDoc, item.path);
        for (const node of nodes) {
          node.setAttribute(item.attr, item.value);
        }
      }
      break;

    case "add_element":
      // Delete what was added — use after paths
      applyChangeToLocalXML({ operation: "delete_element", before: change.after });
      break;

    case "delete_element":
      // Re-add what was deleted — use before data
      applyChangeToLocalXML({ operation: "add_element", after: change.before });
      break;
  }
}
```

---

## 9. Rendering the Live XML Tree

Convert the local XML DOM into a tree data structure for your tree component.

### Building the Tree Data

```javascript
function xmlToTreeData(node, maxDepth = 2, currentDepth = 0) {
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const entry = {
    id: getNodeXPath(node),  // unique key for the tree component
    tag: node.tagName,
    attributes: {},
    text: null,
    childCount: node.children.length,
    children: [],
    expanded: currentDepth < maxDepth,  // auto-expand first N levels
  };

  // Collect attributes
  for (const attr of node.attributes) {
    entry.attributes[attr.name] = attr.value;
  }

  // Collect direct text (not from children)
  const directText = Array.from(node.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent.trim())
    .join("");
  if (directText) entry.text = directText;

  // Recurse into children (lazy: only if within maxDepth)
  if (currentDepth < maxDepth) {
    for (const child of node.children) {
      const childEntry = xmlToTreeData(child, maxDepth, currentDepth + 1);
      if (childEntry) entry.children.push(childEntry);
    }
  }

  return entry;
}

// Build from root
const treeData = xmlToTreeData(state.xmlDoc.documentElement);
```

### Lazy Loading Children on Expand

For large XML files (like the 2MB sample), don't render the full tree. Load children on demand:

```javascript
function loadChildren(nodeXPath) {
  const nodes = evaluateXPath(state.xmlDoc, nodeXPath);
  if (nodes.length === 0) return [];

  const parent = nodes[0];
  return Array.from(parent.children).map(child =>
    xmlToTreeData(child, 0, 0)  // depth 0 = don't recurse further
  );
}
```

### Getting an XPath for a DOM Node

```javascript
function getNodeXPath(node) {
  const parts = [];
  let current = node;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    // Only add index if there are siblings with the same tag
    const hasSameTagSiblings = current.parentNode &&
      Array.from(current.parentNode.children).filter(c => c.tagName === current.tagName).length > 1;
    const part = hasSameTagSiblings ? `${current.tagName}[${index}]` : current.tagName;
    parts.unshift(part);
    current = current.parentNode;
  }
  return "/" + parts.join("/");
}
```

### Tree Node Display Format

Each node in the tree should show:

```
▼ fee  [@id="fA564..."]
    Type: "BrokerFee"
    Amount: "200"         ← yellow highlight after change
    Indicator: "1"
    fValue: "200"         ← yellow highlight after change
```

Display rules:
- **Element nodes**: show tag name + key attributes (like `id`, `type`, `name`)
- **Leaf nodes with text**: show `tag: "text"` on one line
- **Expand/collapse arrow**: for nodes with children
- **Child count badge**: show `(12 children)` for collapsed nodes

---

## 10. Highlighting Changes in the Tree

After receiving a `change_event`, highlight the affected nodes in the tree.

### Tracking Affected Paths

```javascript
function highlightChangedNodes(change) {
  // Collect all paths that were affected
  const paths = new Set();

  if (change.before) {
    for (const item of change.before) {
      if (item.path) paths.add(item.path);
    }
  }
  if (change.after) {
    for (const item of change.after) {
      if (item.path) paths.add(item.path);
    }
  }

  // Mark each path with a highlight color based on operation
  const colorMap = {
    add_element: "green",
    delete_element: "red",
    update_text: "yellow",
    update_attribute: "yellow",
    delete_attribute: "orange",
  };

  for (const path of paths) {
    markTreeNode(path, colorMap[change.operation] || "yellow");
  }

  // Auto-expand the tree to show affected nodes
  for (const path of paths) {
    expandTreeToPath(path);
  }

  // Clear highlights after a delay
  setTimeout(() => {
    for (const path of paths) {
      clearTreeNodeMark(path);
    }
  }, 3000);
}
```

---

## 11. Undo

### Via REST

```
POST /sessions/{session_id}/undo
```

Response:

```json
{
  "success": true,
  "reverted_event": {
    "version": 1,
    "operation": "update_text",
    "xpath": "//policy/EffectiveDate",
    "before": [{"path": "...", "text": "2025-03-24"}],
    "after": [{"path": "...", "text": "2026-01-01"}],
    "affected_count": 1,
    "timestamp": "...",
    "nl_query": "change effective date"
  },
  "current_version": 2
}
```

### Via WebSocket

```javascript
ws.send(JSON.stringify({ action: "undo" }));
// Server responds with type: "undo_result"
```

### Frontend Handling

When you receive the reverted event:

1. Call `revertChangeFromLocalXML(reverted_event)` to undo the change on local DOM.
2. Update `state.version` to the new `current_version`.
3. Re-render the tree.
4. Highlight the reverted nodes with a distinct color (e.g., blue flash).
5. Remove the last entry from the change log panel.

**Note:** Version numbers always go forward. If version was 3 before undo, it becomes 4 after undo (not 2). The backend tracks this.

---

## 12. Change History

### Endpoint

```
GET /sessions/{session_id}/history
```

### Response

```json
{
  "events": [
    {
      "version": 1,
      "operation": "update_text",
      "xpath": "//policy/EffectiveDate",
      "before": [...],
      "after": [...],
      "affected_count": 1,
      "timestamp": "2026-04-10T12:00:00+00:00",
      "nl_query": "change effective date to 2026-01-01"
    },
    {
      "version": 2,
      "operation": "add_element",
      "xpath": "//policy",
      "before": null,
      "after": [...],
      "affected_count": 1,
      "timestamp": "2026-04-10T12:01:00+00:00",
      "nl_query": "add a surcharge fee of 50"
    }
  ],
  "current_version": 2
}
```

### Displaying the Change Log

Show as a timeline/list in a sidebar:

```
┌─ Change History ───────────────────────────────┐
│                                                 │
│  v2 • add_element           12:01 PM            │
│    "add a surcharge fee of 50"                  │
│    Added 1 element under //policy               │
│                                                 │
│  v1 • update_text           12:00 PM            │
│    "change effective date to 2026-01-01"        │
│    Updated 1 element: 2025-03-24 → 2026-01-01  │
│                                                 │
└─────────────────────────────────────────────────┘
```

Clicking a history entry can scroll the tree to the affected node.

---

## 13. Saving to Disk

### Endpoint

```
POST /sessions/{session_id}/save
Content-Type: application/json
```

```json
{
  "filepath": "output/modified_policy.xml"
}
```

Response:

```json
{
  "filepath": "output/modified_policy.xml"
}
```

If `filepath` is omitted, saves to the original upload filename.

### Client-Side Download Alternative

Since the frontend has the full local XML, you can also offer client-side download without hitting the backend:

```javascript
function downloadXML() {
  const serializer = new XMLSerializer();
  const xmlString = serializer.serializeToString(state.xmlDoc);
  const blob = new Blob([xmlString], { type: "application/xml" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "modified_policy.xml";
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## 14. Session Management

### Get Session Info

```
GET /sessions/{session_id}
```

Returns schema, current version, creation timestamp. Use this on page reload to verify the session still exists.

### Delete Session

```
DELETE /sessions/{session_id}
```

Returns `204 No Content`. Call this when the user closes the editor or navigates away.

```javascript
// Clean up on page unload
window.addEventListener("beforeunload", () => {
  navigator.sendBeacon(`http://localhost:8000/sessions/${state.sessionId}`, "");
  // Note: sendBeacon only does POST; for DELETE, use the visibilitychange event:
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    fetch(`http://localhost:8000/sessions/${state.sessionId}`, { method: "DELETE", keepalive: true });
  }
});
```

---

## 15. Error Handling

### REST Errors

| Status | Meaning |
|--------|---------|
| 400 | Bad request (not XML, parse failure) |
| 404 | Session not found (expired or invalid ID) |
| 413 | File too large (default limit: 50MB) |

### WebSocket Errors

The server sends `{"type": "error", "payload": {"message": "..."}}` for:
- Empty query
- Unknown action
- Tool execution failures
- LLM API errors

### Session Expiration

Sessions live in server memory. If the server restarts, all sessions are lost. Handle this on the frontend:

```javascript
async function ensureSession() {
  try {
    const res = await fetch(`http://localhost:8000/sessions/${state.sessionId}`);
    if (res.status === 404) {
      showNotification("Session expired. Please re-upload your XML file.");
      state.sessionId = null;
    }
  } catch (e) {
    showNotification("Backend unreachable.");
  }
}
```

### Version Mismatch Detection

```javascript
function checkVersionSync(incomingVersion) {
  if (incomingVersion !== state.version + 1 && incomingVersion !== state.version) {
    console.warn(`Version gap: local=${state.version}, received=${incomingVersion}`);
    // Option 1: Fetch full history and replay missed events
    // Option 2: Show warning to user
  }
  state.version = incomingVersion;
}
```

---

## 16. Full Workflow Example

Complete frontend flow from file selection to live editing:

```javascript
// ── State ──
const state = {
  sessionId: null,
  xmlDoc: null,
  version: 0,
  ws: null,
  changeLog: [],
};

// ── Step 1: User picks a file ──
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];

  // Parse locally
  const text = await file.text();
  state.xmlDoc = new DOMParser().parseFromString(text, "text/xml");

  // Upload to backend
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("http://localhost:8000/sessions", { method: "POST", body: formData });
  const data = await res.json();

  state.sessionId = data.session_id;
  state.version = data.version;

  // Render initial tree
  renderTree();

  // Connect WebSocket
  state.ws = new WebSocket(`ws://localhost:8000/sessions/${state.sessionId}/ws`);
  state.ws.onmessage = (e) => handleWSMessage(JSON.parse(e.data));
});

// ── Step 2: User sends a query ──
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = chatInput.value.trim();
  if (!query) return;

  appendMessage("user", query);
  chatInput.value = "";

  state.ws.send(JSON.stringify({ action: "chat", query }));
});

// ── Step 3: Handle streaming responses ──
function handleWSMessage(msg) {
  switch (msg.type) {
    case "tool_start":
      showActivity(`${msg.payload.tool_name}(${summarizeArgs(msg.payload.arguments)})`, "running");
      break;

    case "tool_result":
      updateActivity(msg.payload.tool_name, msg.payload.success ? "done" : "failed");
      break;

    case "change_event":
      applyChangeToLocalXML(msg.payload);
      highlightChangedNodes(msg.payload);
      state.changeLog.push(msg.payload);
      state.version = msg.version;
      renderTree();
      renderChangeLog();
      break;

    case "agent_reply":
      appendMessage("agent", msg.payload.content);
      clearActivity();
      break;

    case "undo_result":
      if (msg.payload.reverted_event) {
        revertChangeFromLocalXML(msg.payload.reverted_event);
        state.changeLog.pop();
        state.version = msg.version;
        renderTree();
        renderChangeLog();
      }
      break;

    case "error":
      showError(msg.payload.message);
      break;
  }
}

// ── Step 4: Undo button ──
undoButton.addEventListener("click", () => {
  state.ws.send(JSON.stringify({ action: "undo" }));
});

// ── Step 5: Download modified XML ──
downloadButton.addEventListener("click", () => {
  const xml = new XMLSerializer().serializeToString(state.xmlDoc);
  const blob = new Blob([xml], { type: "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "modified.xml";
  a.click();
});

// ── Step 6: Cleanup ──
window.addEventListener("beforeunload", () => {
  if (state.ws) state.ws.close();
  if (state.sessionId) {
    fetch(`http://localhost:8000/sessions/${state.sessionId}`, { method: "DELETE", keepalive: true });
  }
});
```

---

## Recommended Frontend Libraries

These are optional — the guide above uses vanilla JS. But for production:

| Concern | Suggestion |
|---------|------------|
| Tree component | `react-arborist`, `rc-tree`, or `@mantine/core` Tree |
| Virtual scrolling (large trees) | `react-window` or `tanstack-virtual` |
| WebSocket management | Native `WebSocket` is sufficient; `reconnecting-websocket` for auto-reconnect |
| State management | React `useReducer` or Zustand — the state shape is simple |
| Syntax highlighting (XML preview) | `prism-react-renderer` or `highlight.js` |
