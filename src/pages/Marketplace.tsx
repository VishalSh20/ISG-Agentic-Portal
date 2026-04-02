import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { marketplaceContent } from '@/data/marketplace_content'

interface MarketplaceItem {
  title: string
  description: string
}

const agents: MarketplaceItem[] = marketplaceContent.agents
const mcpServers: MarketplaceItem[] = marketplaceContent.mcp_servers

function renderDescription(description: string) {
  // Render bold markdown (**text**) as <strong>
  const parts = description.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function ItemGrid({ items }: { items: MarketplaceItem[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No items match your search.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, i) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <Card className="border border-border hover:shadow-md transition-shadow h-full">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {renderDescription(item.description)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

export default function Marketplace() {
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const filteredAgents = useMemo(() => {
    if (!search) return agents
    const q = search.toLowerCase()
    return agents.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    )
  }, [search])

  const filteredServers = useMemo(() => {
    if (!search) return mcpServers
    const q = search.toLowerCase()
    return mcpServers.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    )
  }, [search])

  const handleRefresh = () => {
    setRefreshing(true)
    setSearch('')
    setTimeout(() => setRefreshing(false), 600)
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Marketplace</h1>
          <p className="text-muted-foreground mt-1">
            Browse and discover available AI agents and MCP servers
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search agents and MCP servers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">
            AI Agents ({filteredAgents.length})
          </TabsTrigger>
          <TabsTrigger value="mcp_servers">
            MCP Servers ({filteredServers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <ItemGrid items={filteredAgents} />
        </TabsContent>

        <TabsContent value="mcp_servers">
          <ItemGrid items={filteredServers} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
