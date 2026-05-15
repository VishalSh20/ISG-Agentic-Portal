import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, Sparkles, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { createAgent, deleteAgent, setAgentEnabled, refreshAllAgents } from '@/store/slices/agentsSlice'
import { clearAssociatedAgent } from '@/store/slices/workflowsSlice'
import { fetchAgentCard } from '@/api/agents'
import type { AgentCard, AgentSkill } from '@/types'
import toast from 'react-hot-toast'

function isValidUrl(s: string) {
  try {
    new URL(s)
    return true
  } catch {
    return false
  }
}

function StatusBadge({ status }: { status: 'online' | 'offline' | 'unknown' }) {
  const cfg = {
    online: { label: 'Online', cls: 'bg-green-500/15 text-green-600', dot: 'bg-green-500' },
    offline: { label: 'Offline', cls: 'bg-red-500/15 text-red-600', dot: 'bg-red-500' },
    unknown: { label: 'Checking…', cls: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
  }[status]
  return (
    <Badge className={`${cfg.cls} hover:${cfg.cls} border-transparent text-xs font-normal`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5`} />
      {cfg.label}
    </Badge>
  )
}

export default function AgentConfig() {
  const dispatch = useAppDispatch()
  const agents = useAppSelector((s) => s.agents.agents)

  useEffect(() => {
    dispatch(refreshAllAgents())
  }, [dispatch])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [cardUrl, setCardUrl] = useState('')
  const [headerRows, setHeaderRows] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' },
  ])
  const [card, setCard] = useState<AgentCard | null>(null)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const MAX_HEADERS = 5

  const resetDialog = () => {
    setCardUrl('')
    setHeaderRows([{ key: '', value: '' }])
    setCard(null)
    setFetching(false)
    setError(null)
  }

  const buildHeaders = (): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const { key, value } of headerRows) {
      const k = key.trim()
      if (k) out[k] = value
    }
    return out
  }

  const updateHeader = (i: number, field: 'key' | 'value', val: string) => {
    setHeaderRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

  const addHeaderRow = () => {
    setHeaderRows((rows) => (rows.length >= MAX_HEADERS ? rows : [...rows, { key: '', value: '' }]))
  }

  const removeHeaderRow = (i: number) => {
    setHeaderRows((rows) => (rows.length === 1 ? [{ key: '', value: '' }] : rows.filter((_, idx) => idx !== i)))
  }

  const openCreate = () => {
    resetDialog()
    setDialogOpen(true)
  }

  const handleFetch = async () => {
    setError(null)
    if (!cardUrl || !isValidUrl(cardUrl)) {
      setError('Enter a valid agent card URL')
      return
    }
    setFetching(true)
    setCard(null)
    try {
      const c = await fetchAgentCard(cardUrl, buildHeaders())
      setCard(c)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch agent card'
      setError(`Could not load agent card: ${msg}`)
    } finally {
      setFetching(false)
    }
  }

  const handleSave = async () => {
    if (!card) return
    const headers = buildHeaders()
    try {
      await dispatch(
        createAgent({
          title: card.name,
          description: card.description,
          url: card.url || cardUrl,
          skills: card.skills ?? [],
          enabled: true,
          cardUrl,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        }),
      ).unwrap()
      toast.success('Agent added')
      setDialogOpen(false)
      resetDialog()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save agent'
      toast.error(msg)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    dispatch(clearAssociatedAgent(deleteId))
    await dispatch(deleteAgent(deleteId))
    toast.success('Agent deleted')
    setDeleteId(null)
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agents</h1>
          <p className="text-muted-foreground mt-1">Manage AI agent configurations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => dispatch(refreshAllAgents())}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Agent
          </Button>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No agents configured yet. Click "Add Agent" to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Card key={agent.id} className="border border-border flex flex-col">
              <CardContent className="flex flex-col h-full gap-3 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{agent.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={agent.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={agent.enabled ?? true}
                      onCheckedChange={(checked) =>
                        dispatch(setAgentEnabled({ id: agent.id, enabled: checked }))
                      }
                      aria-label="Toggle agent"
                    />
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(agent.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
                {agent.url && (
                  <p className="text-xs text-muted-foreground font-mono truncate">{agent.url}</p>
                )}

                {agent.skills && agent.skills.length > 0 && (
                  <div className="space-y-2 mt-1">
                    <p className="text-xs font-medium text-foreground">Skills</p>
                    <div className="space-y-2">
                      {agent.skills.map((skill, i) => (
                        <SkillBlock key={skill.id ?? `${skill.name}-${i}`} skill={skill} />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetDialog()
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agent card URL</Label>
              <div className="flex gap-2">
                <Input
                  value={cardUrl}
                  onChange={(e) => setCardUrl(e.target.value)}
                  placeholder="Enter the agent card url"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleFetch()
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={handleFetch} disabled={fetching}>
                  {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span className="ml-2">Fetch</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Full URL to the agent card. Generic A2A agents typically expose it at <code>/.well-known/agent-card.json</code>.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Headers (optional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addHeaderRow}
                  disabled={headerRows.length >= MAX_HEADERS}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add header
                </Button>
              </div>
              <div className="space-y-2">
                {headerRows.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={row.key}
                      onChange={(e) => updateHeader(i, 'key', e.target.value)}
                      placeholder="Header name"
                      className="flex-1"
                    />
                    <Input
                      value={row.value}
                      onChange={(e) => updateHeader(i, 'value', e.target.value)}
                      placeholder="Value"
                      type="password"
                      autoComplete="off"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHeaderRow(i)}
                      aria-label="Remove header"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Up to {MAX_HEADERS} headers. Used for auth on agents that protect the card endpoint.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {card && (
              <div className="border border-border rounded-md p-4 space-y-3 bg-muted/30">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
                  <p className="font-medium text-foreground">{card.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
                  <p className="text-sm text-foreground">{card.description}</p>
                </div>
                {card.skills && card.skills.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Skills</p>
                    <div className="space-y-2">
                      {card.skills.map((skill, i) => (
                        <SkillBlock key={skill.id ?? `${skill.name}-${i}`} skill={skill} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!card}>
              Add Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SkillBlock({ skill }: { skill: AgentSkill }) {
  return (
    <div className="rounded-md border border-border bg-background p-3 space-y-1.5">
      <p className="text-sm font-medium text-foreground">{skill.name}</p>
      {skill.description && (
        <p className="text-xs text-muted-foreground">{skill.description}</p>
      )}
      {skill.tags && skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {skill.tags.map((t) => (
            <Badge key={t} variant="outline" className="text-xs font-normal">
              {t}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
