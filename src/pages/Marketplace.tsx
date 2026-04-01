import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppSelector, useAppDispatch } from '@/store'
import { updateAgentStatus } from '@/store/slices/agentsSlice'
import { checkAgentHealth } from '@/api/agents'

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'online'
      ? 'bg-green-500'
      : status === 'offline'
        ? 'bg-red-500'
        : 'bg-gray-400'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}

export default function Marketplace() {
  const agents = useAppSelector((s) => s.agents.agents)
  const dispatch = useAppDispatch()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [checking, setChecking] = useState(false)

  const refreshHealth = useCallback(async () => {
    setChecking(true)
    await Promise.all(
      agents.map(async (agent) => {
        if (!agent.url) return
        const status = await checkAgentHealth(agent.url)
        dispatch(updateAgentStatus({ id: agent.id, status }))
      })
    )
    setChecking(false)
  }, [agents, dispatch])

  // Check health on mount
  useEffect(() => {
    if (agents.length > 0) refreshHealth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.length])

  const categories = useMemo(() => {
    const cats = new Set(agents.map((a) => a.category).filter(Boolean))
    return ['all', ...Array.from(cats)] as string[]
  }, [agents])

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      const matchSearch =
        !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'all' || a.category === category
      return matchSearch && matchCategory
    })
  }, [agents, search, category])

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Marketplace</h1>
            <p className="text-muted-foreground mt-1">
              Browse and discover available AI agents
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshHealth} disabled={checking}>
            <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking...' : 'Refresh Status'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c === 'all' ? 'All Categories' : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          {agents.length === 0
            ? 'No agents configured yet. Add agents in Configuration → Agents.'
            : 'No agents match your search.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="border border-border hover:shadow-md transition-shadow h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground">{agent.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {agent.description}
                  </p>
                  
                  {agent.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.capabilities.slice(0, 4).map((cap) => (
                        <Badge key={cap} variant="outline" className="text-xs font-normal">
                          {cap}
                        </Badge>
                      ))}
                      {agent.capabilities.length > 4 && (
                        <Badge variant="outline" className="text-xs font-normal">
                          +{agent.capabilities.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
