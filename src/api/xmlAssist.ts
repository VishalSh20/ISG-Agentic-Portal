/* ── XML Assist REST API layer ── */

const XML_AGENT_BASE = import.meta.env.VITE_XML_AGENT_URL || 'http://localhost:8000'

export async function uploadXmlFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${XML_AGENT_BASE}/sessions`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as {
    session_id: string
    schema: Record<string, unknown>
    version: number
  }
}

export async function undoLastChange(sessionId: string) {
  const res = await fetch(`${XML_AGENT_BASE}/sessions/${sessionId}/undo`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(await res.text())
  return await res.json()
}

export async function getChangeHistory(sessionId: string) {
  const res = await fetch(`${XML_AGENT_BASE}/sessions/${sessionId}/history`)
  if (!res.ok) throw new Error(await res.text())
  return await res.json()
}

export async function deleteSession(sessionId: string) {
  await fetch(`${XML_AGENT_BASE}/sessions/${sessionId}`, { method: 'DELETE', keepalive: true })
}

export function getWebSocketUrl(sessionId: string) {
  const wsBase = XML_AGENT_BASE.replace(/^http/, 'ws')
  return `${wsBase}/sessions/${sessionId}/ws`
}

export function downloadXml(xmlDoc: Document, filename: string) {
  const serializer = new XMLSerializer()
  const xmlString = serializer.serializeToString(xmlDoc)
  const blob = new Blob([xmlString], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
