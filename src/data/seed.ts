import type { AppDispatch } from '@/store'
import { setServers } from '@/store/slices/mcpServersSlice'
import type { MCPServer } from '@/types'

let seeded = false

export function seedDemoData(dispatch: AppDispatch) {
  if (seeded) return
  seeded = true

  const now = new Date().toISOString()

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

  dispatch(setServers(servers))
}
