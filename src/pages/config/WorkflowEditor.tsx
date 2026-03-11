import { useState } from 'react'
import { Plus, Pencil, Trash2, GripVertical, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAppDispatch, useAppSelector } from '@/store'
import { createWorkflow, updateWorkflow, deleteWorkflow } from '@/store/slices/workflowsSlice'
import { validateWorkflow } from '@/utils/validation'
import { normalizeStepOrder } from '@/utils/normalizeStepOrder'
import { buildSystemPrompt } from '@/utils/buildSystemPrompt'
import { generateId } from '@/utils/helpers'
import type { WorkflowFormData } from '@/types/forms'
import type { Workflow, WorkflowStep } from '@/types'
import toast from 'react-hot-toast'

const emptyForm: WorkflowFormData = {
  name: '', description: '', steps: [], associatedAgentId: undefined,
}

export default function WorkflowEditorPage() {
  const dispatch = useAppDispatch()
  const workflows = useAppSelector((s) => s.workflows.workflows)
  const agents = useAppSelector((s) => s.agents.agents)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewText, setPreviewText] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Workflow | null>(null)
  const [form, setForm] = useState<WorkflowFormData>(emptyForm)
  const [errors, setErrors] = useState<string[]>([])

  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setErrors([]); setDialogOpen(true)
  }

  const openEdit = (w: Workflow) => {
    setEditing(w)
    setForm({ name: w.name, description: w.description, steps: w.steps.map((s) => ({ ...s })), associatedAgentId: w.associatedAgentId })
    setErrors([]); setDialogOpen(true)
  }

  const handleSave = async () => {
    const normalized = { ...form, steps: normalizeStepOrder(form.steps as WorkflowStep[]) }
    const errs = validateWorkflow(normalized)
    if (errs.length > 0) { setErrors(errs); return }
    if (editing) {
      await dispatch(updateWorkflow({ id: editing.id, data: normalized }))
      toast.success('Workflow updated')
    } else {
      await dispatch(createWorkflow(normalized))
      toast.success('Workflow created')
    }
    setDialogOpen(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await dispatch(deleteWorkflow(deleteId))
    toast.success('Workflow deleted')
    setDeleteId(null)
  }

  const addStep = () => {
    const newStep: WorkflowStep = { id: generateId(), order: form.steps.length + 1, instruction: '', toolHint: '' }
    setForm({ ...form, steps: [...form.steps, newStep] })
  }

  const removeStep = (idx: number) => {
    const steps = form.steps.filter((_, i) => i !== idx)
    setForm({ ...form, steps: normalizeStepOrder(steps as WorkflowStep[]) })
  }

  const updateStep = (idx: number, field: string, value: string) => {
    const steps = form.steps.map((s, i) => i === idx ? { ...s, [field]: value } : s)
    setForm({ ...form, steps })
  }

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= form.steps.length) return
    const steps = [...form.steps]
    const [moved] = steps.splice(from, 1)
    steps.splice(to, 0, moved)
    setForm({ ...form, steps: normalizeStepOrder(steps as WorkflowStep[]) })
  }

  const showPreview = (w: Workflow) => {
    const agent = agents.find((a) => a.id === w.associatedAgentId) || {
      id: '', title: 'Agent', description: 'An AI agent', url: '', healthEndpoint: '', status: 'unknown' as const, capabilities: [], createdAt: '', updatedAt: '',
    }
    setPreviewText(buildSystemPrompt(agent, w))
    setPreviewOpen(true)
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Workflows</h1>
          <p className="text-muted-foreground mt-1">Create and manage agentic workflow step sequences</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Workflow</Button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No workflows yet.</div>
      ) : (
        <div className="space-y-3">
          {workflows.map((w) => (
            <Card key={w.id} className="border border-border">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">{w.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{w.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{w.steps.length} step{w.steps.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => showPreview(w)}><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(w)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(w.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Workflow' : 'Add Workflow'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {errors.length > 0 && <div className="text-sm text-destructive space-y-1">{errors.map((e, i) => <p key={i}>{e}</p>)}</div>}
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Workflow name" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="space-y-2">
              <Label>Associated Agent (optional)</Label>
              <Select value={form.associatedAgentId || '_none'} onValueChange={(v) => setForm({ ...form, associatedAgentId: v === '_none' ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}><Plus className="w-3 h-3 mr-1" /> Add Step</Button>
              </div>
              {form.steps.map((step, idx) => (
                <div key={step.id} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex flex-col items-center gap-1 pt-2">
                    <button onClick={() => moveStep(idx, idx - 1)} className="text-muted-foreground hover:text-foreground text-xs" disabled={idx === 0}>↑</button>
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <button onClick={() => moveStep(idx, idx + 1)} className="text-muted-foreground hover:text-foreground text-xs" disabled={idx === form.steps.length - 1}>↓</button>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground pt-2 w-6 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <Input value={step.instruction} onChange={(e) => updateStep(idx, 'instruction', e.target.value)} placeholder="Step instruction" />
                    <Input value={step.toolHint || ''} onChange={(e) => updateStep(idx, 'toolHint', e.target.value)} placeholder="Tool hint (optional)" className="text-xs" />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeStep(idx)} className="shrink-0 mt-1">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              {form.steps.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No steps yet. Add at least one step.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Workflow'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>System Prompt Preview</DialogTitle></DialogHeader>
          <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">{previewText}</pre>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this workflow.</AlertDialogDescription>
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
