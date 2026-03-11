import { useState } from 'react'
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAppDispatch, useAppSelector } from '@/store'
import { createServer, updateServer, deleteServer } from '@/store/slices/mcpServersSlice'
import { validateMCPServer, deriveHealthEndpoint } from '@/utils/validation'
import type { MCPServerFormData } from '@/types/forms'
import type { MCPServer } from '@/types'
import toast from 'react-hot-toast'

const emptyForm: MCPServerFormData = {
  title: '', description: '', url: '', healthEndpoint: '', tools: [],
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'online' ? 'bg-green-500' : status === 'offline' ? 'bg-red-500' : 'bg-gray-400'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}

export default function MCPServerConfig() {
  const dispatch = useAppDispatch()
  const servers = useAppSelector((s) => s.mcpServers.servers)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<MCPServer | null>(null)
  const [form, setForm] = useState<MCPServerFormData>(emptyForm)
  const [toolName, setToolName] = useState('')
  const [toolDesc, setToolDesc] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setErrors([]); setDialogOpen(true) }

  const openEdit = (s: MCPServer) => {
    setEditing(s)
    setForm({ title: s.title, description: s.description, url: s.url, healthEndpoint: s.healthEndpoint, tools: [...s.tools] })
    setErrors([])
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const d = { ...form, healthEndpoint: deriveHealthEndpoint(form.url, form.healthEndpoint) }
    const errs = validateMCPServer(d)
    if (errs.length > 0) { setErrors(errs); return }
    if (editing) {
      await dispatch(updateServer({ id: editing.id, data: d }))
      toast.success('Server updated')
    } else {
      await dispatch(createServer(d))
      toast.success('Server created')
    }
    setDialogOpen(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await dispatch(deleteServer(deleteId))
    toast.success('Server deleted')
    setDeleteId(null)
  }

  const addTool = () => {
    const n = toolName.trim()
    if (n) {
      setForm({ ...form, tools: [...form.tools, { name: n, description: toolDesc.trim() }] })
      setToolName(''); setToolDesc('')
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">MCP Servers</h1>
          <p className="text-muted-foreground mt-1">Manage Model Context Protocol server configurations</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Server</Button>
      </div>

      {servers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No MCP servers configured yet.</div>
      ) : (
        <div className="space-y-3">
          {servers.map((s) => (
            <Card key={s.id} className="border border-border">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{s.title}</h3>
                    <StatusDot status={s.status} />
                    <span className="text-xs text-muted-foreground capitalize">{s.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{s.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{s.url}</p>
                  {s.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.tools.map((t) => (
                        <Badge key={t.name} variant="outline" className="text-xs font-normal">
                          <Wrench className="w-3 h-3 mr-1" />{t.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit MCP Server' : 'Add MCP Server'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {errors.length > 0 && <div className="text-sm text-destructive space-y-1">{errors.map((e, i) => <p key={i}>{e}</p>)}</div>}
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Server title" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://mcp-server:9090" /></div>
            <div className="space-y-2"><Label>Health Endpoint (optional)</Label><Input value={form.healthEndpoint} onChange={(e) => setForm({ ...form, healthEndpoint: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Tools</Label>
              <div className="flex gap-2">
                <Input value={toolName} onChange={(e) => setToolName(e.target.value)} placeholder="Tool name" className="flex-1" />
                <Input value={toolDesc} onChange={(e) => setToolDesc(e.target.value)} placeholder="Description" className="flex-1" />
                <Button type="button" variant="secondary" onClick={addTool}>Add</Button>
              </div>
              {form.tools.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tools.map((t, i) => (
                    <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setForm({ ...form, tools: form.tools.filter((_, j) => j !== i) })}>
                      {t.name} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Server'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete MCP Server</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this MCP server configuration.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
