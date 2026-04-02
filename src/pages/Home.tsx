import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, Store, Settings, MessageSquare, GitBranch, Server, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useAppSelector } from '@/store'

const features = [
  {
    title: 'Agent Marketplace',
    description: 'Browse and discover AI agents with their capabilities and health status.',
    icon: Store,
    path: '/marketplace',
    color: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
  },
  {
    title: 'Configuration',
    description: 'Manage agents, MCP servers, and workflow configurations.',
    icon: Settings,
    path: '/config/agents',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    title: 'AI Assistant',
    description: 'Chat with AI agents using workflow-guided orchestration.',
    icon: MessageSquare,
    path: '/assistant',
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
  {
    title: 'Workflows',
    description: 'Create and manage ordered step sequences for agent behavior.',
    icon: GitBranch,
    path: '/config/workflows',
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const agentCount = useAppSelector((s) => s.agents.agents.length)
  const serverCount = useAppSelector((s) => s.mcpServers.servers.length)
  const workflowCount = useAppSelector((s) => s.workflows.workflows.length)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
      >
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
          {greeting()}, {user?.username || 'User'}
        </h1>
        <p className="text-muted-foreground text-lg">
          Welcome to the Telecom Agentic Core Portal. Manage your AI agents, workflows, and more.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          { label: 'Agents', count: agentCount, icon: Bot, color: 'text-orange-600' },
          { label: 'MCP Servers', count: serverCount, icon: Server, color: 'text-blue-600' },
          { label: 'Workflows', count: workflowCount, icon: GitBranch, color: 'text-purple-600' },
        ].map((stat) => (
          <Card key={stat.label} className="border border-border">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-2.5 rounded-lg bg-muted">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.count}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Quick Start */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Quick Start</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
            >
              <Card
                className="border border-border cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(feature.path)}
              >
                <CardContent className="flex items-start gap-4 p-5">
                  <div className={`p-2.5 rounded-lg ${feature.bg} shrink-0`}>
                    <feature.icon className={`w-5 h-5 ${feature.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground">{feature.title}</h3>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
