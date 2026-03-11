import type { AppDispatch } from '@/store'
import { setAgents } from '@/store/slices/agentsSlice'
import { setServers } from '@/store/slices/mcpServersSlice'
import type { Agent, MCPServer, Workflow } from '@/types'

let seeded = false

export function seedDemoData(dispatch: AppDispatch) {
  if (seeded) return
  seeded = true

  const now = new Date().toISOString()

  const agents: Agent[] = [
    {
      id: 'agent-1',
      title: 'ServiceNow Agent',
      description: 'Handles ServiceNow ITSM operations including incident management, change requests, and service catalog.',
      url: 'http://agent-host:8080',
      healthEndpoint: 'http://agent-host:8080/health',
      status: 'online',
      capabilities: ['incident-management', 'change-management', 'service-catalog'],
      category: 'ITSM',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'agent-2',
      title: 'Telecom Order Agent',
      description: 'Manages telecom domain order creation, child order processing, and status updates.',
      url: 'http://telecom-agent:8081',
      healthEndpoint: 'http://telecom-agent:8081/health',
      status: 'online',
      capabilities: ['order-creation', 'order-tracking', 'status-updates'],
      category: 'Telecom',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'agent-3',
      title: 'Data Pipeline Agent',
      description: 'Async ETL pipeline for processing and embedding large document corpora.',
      url: 'http://data-agent:8082',
      healthEndpoint: 'http://data-agent:8082/health',
      status: 'offline',
      capabilities: ['etl-processing', 'document-embedding', 'batch-operations'],
      category: 'Data',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'agent-4',
      title: 'Analytics Agent',
      description: 'Optimised SQL views and materialized tables for real-time usage analytics.',
      url: 'http://analytics-agent:8083',
      healthEndpoint: 'http://analytics-agent:8083/health',
      status: 'online',
      capabilities: ['sql-queries', 'real-time-analytics', 'reporting'],
      category: 'Analytics',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'agent-5',
      title: 'Gateway Service Agent',
      description: 'High-throughput microservice handling auth, routing and load-shedding.',
      url: 'http://gateway-agent:8084',
      healthEndpoint: 'http://gateway-agent:8084/health',
      status: 'online',
      capabilities: ['authentication', 'routing', 'load-balancing'],
      category: 'Infrastructure',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'agent-6',
      title: 'Code Review Agent',
      description: 'Automated code review with best practices enforcement and security scanning.',
      url: 'http://code-agent:8085',
      healthEndpoint: 'http://code-agent:8085/health',
      status: 'unknown',
      capabilities: ['code-review', 'security-scan', 'best-practices'],
      category: 'DevOps',
      createdAt: now,
      updatedAt: now,
    },
  ]

  const servers: MCPServer[] = [
    {
      id: 'mcp-1',
      title: 'ServiceNow MCP',
      description: 'MCP server exposing ServiceNow ITSM tools',
      url: 'http://mcp-servicenow:9090',
      healthEndpoint: 'http://mcp-servicenow:9090/health',
      status: 'online',
      tools: [
        { name: 'getIncident', description: 'Retrieve incident details' },
        { name: 'createIncident', description: 'Create a new incident' },
        { name: 'updateIncident', description: 'Update incident status' },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mcp-2',
      title: 'Telecom Orders MCP',
      description: 'MCP server for telecom order management tools',
      url: 'http://mcp-telecom:9091',
      healthEndpoint: 'http://mcp-telecom:9091/health',
      status: 'online',
      tools: [
        { name: 'getDomainOrder', description: 'Get domain order details' },
        { name: 'getChildOrders', description: 'Get child domain orders' },
        { name: 'updateOrderStatus', description: 'Update order status' },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mcp-3',
      title: 'Database MCP',
      description: 'MCP server for database query operations',
      url: 'http://mcp-db:9092',
      healthEndpoint: 'http://mcp-db:9092/health',
      status: 'offline',
      tools: [
        { name: 'executeQuery', description: 'Execute SQL query' },
        { name: 'getSchema', description: 'Get database schema' },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ]

  dispatch(setAgents(agents))
  dispatch(setServers(servers))
}
