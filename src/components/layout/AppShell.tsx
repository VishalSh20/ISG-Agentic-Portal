import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  Search,
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
  const darkMode = useAppSelector((s) => s.theme.darkMode)
  const user = useAppSelector((s) => s.auth.user)
  const [collapsed, setCollapsed] = useState(false)
  const [configOpen, setConfigOpen] = useState(true)
  const location = useLocation()

  const handleLogout = () => {
    dispatch(clearAuth())
  }

  return (
    <div className={cn('flex h-screen', darkMode && 'dark')}>
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-sidebar transition-all duration-200',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <img src="/Cognizant.svg" alt="Cognizant" className="w-8 h-8 shrink-0" />
          {!collapsed && (
            <span className="font-semibold text-sm text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
              ISG Agentic Core
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1" style={{ fontFamily: 'var(--font-heading)' }}>
          {NAV_ITEMS.map((item) => {
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

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground"
            >
              {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
            <div className="hidden sm:flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Search...</span>
            </div>
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

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
