import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Store,
  Settings,
  Bot,
  Server,
  GitBranch,
  MessageSquare,
  UserIcon,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { useAppDispatch, useAppSelector } from '@/store'
import { toggleDarkMode } from '@/store/slices/themeSlice'
import { clearAuth } from '@/store/slices/authSlice'
import { switchThread, createThread } from '@/store/slices/chatSlice'
import type { NavItem } from '@/types'
import { cn } from '@/lib/utils'

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', icon: Home, path: '/' },
  { key: 'marketplace', label: 'Marketplace', icon: Store, path: '/marketplace' },
  {
    key: 'config',
    label: 'Configuration',
    icon: Settings,
    path: '/config',
    children: [
      { key: 'agents', label: 'Agents', icon: Bot, path: '/config/agents' },
      { key: 'mcp-servers', label: 'MCP Servers', icon: Server, path: '/config/mcp-servers' },
      { key: 'workflows', label: 'Workflows', icon: GitBranch, path: '/config/workflows' },
    ],
  },
  { key: 'assistant', label: 'AI Assistant', icon: MessageSquare, path: '/assistant' },
  { key: 'account', label: 'Account Settings', icon: UserIcon, path: '/account' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const darkMode = useAppSelector((s) => s.theme.darkMode)
  const user = useAppSelector((s) => s.auth.user)
  const threads = useAppSelector((s) => s.chat.threads)
  const activeThreadId = useAppSelector((s) => s.chat.activeThreadId)
  const userPrefs = useAppSelector((s) => s.auth.user?.preferences)

  const [collapsed, setCollapsed] = useState(false)
  const [configOpen, setConfigOpen] = useState(true)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const location = useLocation()

  const recentThreads = threads.slice(0, 5)

  const handleLogout = () => {
    dispatch(clearAuth())
  }

  const handleThreadClick = (threadId: string) => {
    dispatch(switchThread(threadId))
    navigate('/assistant')
  }

  const handleNewChat = async () => {
    const agentId = userPrefs?.defaultAgentId || 'orchestrator'
    await dispatch(createThread({ agentId })).unwrap()
    navigate('/assistant')
  }

  return (
    <div className={cn('flex flex-col h-screen', darkMode && 'dark')}>
      {/* ── Full-width header ── */}
      <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-3">
          <img src="/Cognizant.svg" alt="Cognizant" className="w-8 h-8 shrink-0" />
          <span className="font-semibold text-sm text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
            Telecom Agentic Core
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(toggleDarkMode())}
            className="text-muted-foreground"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <NavLink to="/account" className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Account Settings
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Sidebar + page content ── */}
      <div className="flex flex-1 min-h-0">
        <aside
          className={cn(
            'flex flex-col border-r border-border bg-sidebar transition-all duration-200 shrink-0',
            collapsed ? 'w-16' : 'w-64'
          )}
        >
          {/* Sidebar toggle */}
          <div className="px-2 pt-3 pb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((prev) => !prev)}
              className="text-muted-foreground"
            >
              {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
          </div>
          <Separator className="mb-2" />

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-1 px-2 space-y-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {NAV_ITEMS.map((item) => {
              // Configuration submenu
              if (item.children) {
                const isActive = location.pathname.startsWith('/config')
                return (
                  <div key={item.key}>
                    <button
                      onClick={() => setConfigOpen(!configOpen)}
                      className={cn(
                        'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'text-foreground bg-accent'
                          : 'text-sidebar-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {configOpen ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </>
                      )}
                    </button>
                    {configOpen && !collapsed && (
                      <div className="ml-4 mt-1 space-y-0.5">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.key}
                            to={child.path}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors',
                                isActive
                                  ? 'text-foreground bg-accent font-medium'
                                  : 'text-sidebar-foreground hover:bg-accent hover:text-foreground'
                              )
                            }
                          >
                            <child.icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{child.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              // AI Assistant with recent threads dropdown
              if (item.key === 'assistant') {
                const isActive = location.pathname === '/assistant'
                return (
                  <div key={item.key}>
                    <div className="flex items-center">
                      <NavLink
                        to={item.path}
                        end
                        className={cn(
                          'flex items-center gap-3 flex-1 rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'text-foreground bg-accent font-medium'
                            : 'text-sidebar-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                      </NavLink>
                      {!collapsed && (
                        <button
                          onClick={() => setAssistantOpen(!assistantOpen)}
                          className="rounded p-1 text-sidebar-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          {assistantOpen ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                    {assistantOpen && !collapsed && (
                      <div className="ml-4 mt-1 space-y-0.5">
                        <button
                          onClick={handleNewChat}
                          className="flex items-center gap-3 w-full rounded-lg px-3 py-1.5 text-sm transition-colors text-sidebar-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>New Chat</span>
                        </button>
                        {recentThreads.length > 0 && (
                          <>
                            <Separator className="my-1" />
                            {recentThreads.map((thread) => (
                              <button
                                key={thread.id}
                                onClick={() => handleThreadClick(thread.id)}
                                className={cn(
                                  'flex items-center gap-3 w-full rounded-lg px-3 py-1.5 text-sm transition-colors text-left',
                                  thread.id === activeThreadId
                                    ? 'text-foreground bg-accent font-medium'
                                    : 'text-sidebar-foreground hover:bg-accent hover:text-foreground'
                                )}
                              >
                                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{thread.title}</span>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              // Regular nav items
              return (
                <NavLink
                  key={item.key}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'text-foreground bg-accent font-medium'
                        : 'text-sidebar-foreground hover:bg-accent hover:text-foreground'
                    )
                  }
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              )
            })}
          </nav>

          {/* User section at bottom */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.username || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || 'user@cognizant.com'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}