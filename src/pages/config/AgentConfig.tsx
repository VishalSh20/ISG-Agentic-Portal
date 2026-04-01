import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAppDispatch, useAppSelector } from '@/store'
import { createAgent, updateAgent, deleteAgent } from '@/store/slices/agentsSlice'
import { clearAssociatedAgent } from '@/store/slices/workflowsSlice'
import { validateAgent, deriveHealthEndpoint } from '@/utils/validation'
import type { AgentFormData } from '@/types/forms'
import type { Agent } from '@/types'
import toast from 'react-hot-toast'

const emptyForm: AgentFormData = {
  title: '',
  description: '',
  url: '',
  healthEndpoint: '',
  capabilities: [],
  category: '',
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'online' ? 'bg-green-500' : status === 'offline' ? 'bg-red-500' : 'bg-gray-400'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}

export default function AgentConfig() {
  const dispatch = useAppDispatch()
  const agents = useAppSelector((s) => s.agents.agents)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [form, setForm] = useState<AgentFormData>(emptyForm)
  const [capInput, setCapInput] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  const openCreate = () => {
    setEditingAgent(null)
    setForm(emptyForm)
    setCapInput('')
    setErrors([])
    setDialogOpen(true)
  }

  const openEdit = (agent: Agent) => {
    setEditingAgent(agent)
    setForm({
      title: agent.title,
      description: agent.description,
      url: agent.url,
      healthEndpoint: agent.healthEndpoint,
      capabilities: [...agent.capabilities],
      category: agent.category || '',
    })
    setCapInput('')
    setErrors([])
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const formWithHealth = {
      ...form,
      healthEndpoint: deriveHealthEndpoint(form.url, form.healthEndpoint),
    }
    const errs = validateAgent(formWithHealth)
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    if (editingAgent) {
      await dispatch(updateAgent({ id: editingAgent.id, data: formWithHealth }))
      toast.success('Agent updated')
    } else {
      await dispatch(createAgent(formWithHealth))
      toast.success('Agent created')
    }
    setDialogOpen(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    dispatch(clearAssociatedAgent(deleteId))
    await dispatch(deleteAgent(deleteId))
    toast.success('Agent deleted')
    setDeleteId(null)
  }

  const addCapability = () => {
    const cap = capInput.trim()
    if (cap && !form.capabilities.includes(cap)) {
      setForm({ ...form, capabilities: [...form.capabilities, cap] })
    }
    setCapInput('')
  }

  const removeCapability = (cap: string) => {
    setForm({ ...form, capabilities: form.capabilities.filter((c) => c !== cap) })
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agents</h1>
          <p className="text-muted-foreground mt-1">Manage AI agent configurations</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Add Agent
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No agents configured yet. Click "Add Agent" to get started.
        </div>
      ) : (
       
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Card key={agent.id} className="border border-border flex flex-col">
              {/* Adjusted CardContent to stack vertically */}
              <CardContent className="flex flex-col h-full gap-3 p-4">
                
                {/* Header: Title, Status & Actions */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">{agent.title}</h3>
                      <StatusDot status={agent.status} />
                    </div>
                    <span className="text-xs text-muted-foreground capitalize mt-0.5 block">{agent.status}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 -mt-1 -mr-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(agent)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(agent.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Body: Description & URL */}
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{agent.url}</p>
                </div>

                {/* Footer: Capabilities */}
                {agent.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-auto pt-2">
                    {agent.capabilities.map((c) => (
                      <Badge key={c} variant="outline" className="text-xs font-normal">{c}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAgent ? 'Edit Agent' : 'Add Agent'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {errors.length > 0 && (
              <div className="text-sm text-destructive space-y-1">
                {errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Agent title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this agent do?" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://agent-host:8080" />
            </div>
            <div className="space-y-2">
              <Label>Health Endpoint (optional)</Label>
              <Input value={form.healthEndpoint} onChange={(e) => setForm({ ...form, healthEndpoint: e.target.value })} placeholder="Defaults to {url}/health" />
            </div>
            <div className="space-y-2">
              <Label>Category (optional)</Label>
              <Input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. ITSM, Telecom" />
            </div>
            <div className="space-y-2">
              <Label>Capabilities</Label>
              <div className="flex gap-2">
                <Input
                  value={capInput}
                  onChange={(e) => setCapInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
                  placeholder="Add capability"
                />
                <Button type="button" variant="secondary" onClick={addCapability}>Add</Button>
              </div>
              {form.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.capabilities.map((c) => (
                    <Badge key={c} variant="secondary" className="cursor-pointer" onClick={() => removeCapability(c)}>
                      {c} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingAgent ? 'Save Changes' : 'Create Agent'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the agent. Workflows referencing this agent will have their association cleared. Chat threads will retain history but won't accept new messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}