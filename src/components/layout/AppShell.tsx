import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  Store,
  Bot,
  Server,
  GitBranch,
  MessageSquare,
  FileCode2,
  UserIcon,
  Plus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import AppHeader from '@/components/layout/AppHeader'
import { useAppDispatch, useAppSelector } from '@/store'
import { switchThread, startNewChat } from '@/store/slices/chatSlice'
import { switchSession, startNewSession } from '@/store/slices/xmlAssistSlice'
import { cn } from '@/lib/utils'

type SimpleItem = { label: string; icon: LucideIcon; path: string; end?: boolean }

const NAVIGATE: SimpleItem[] = [
  { label: 'Home', icon: Home, path: '/', end: true },
  { label: 'Marketplace', icon: Store, path: '/marketplace' },
]

const CONFIGURATION: SimpleItem[] = [
  { label: 'Agents', icon: Bot, path: '/config/agents' },
  { label: 'MCP Servers', icon: Server, path: '/config/mcp-servers' },
  { label: 'Workflows', icon: GitBranch, path: '/config/workflows' },
]

const ACCOUNT: SimpleItem[] = [
  { label: 'Account Settings', icon: UserIcon, path: '/account' },
]

const navItemClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
    isActive
      ? 'bg-accent text-foreground font-medium'
      : 'text-sidebar-foreground hover:bg-accent/60 hover:text-foreground',
  )

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  )
}

function NavRow({ item }: { item: SimpleItem }) {
  const Icon = item.icon
  return (
    <NavLink to={item.path} end={item.end} className={navItemClasses}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const darkMode = useAppSelector((s) => s.theme.darkMode)
  const user = useAppSelector((s) => s.auth.user)
  const threads = useAppSelector((s) => s.chat.threads)
  const activeThreadId = useAppSelector((s) => s.chat.activeThreadId)
  const xmlSessions = useAppSelector((s) => s.xmlAssist.sessions)
  const activeXmlSessionId = useAppSelector((s) => s.xmlAssist.activeSessionId)

  const recentThreads = threads.slice(0, 6)
  const recentXmlSessions = xmlSessions.slice(0, 6)

  const openThread = (id: string) => {
    dispatch(switchThread(id))
    navigate('/assistant')
  }
  const newChat = () => {
    dispatch(startNewChat())
    navigate('/assistant')
  }
  const openSession = (id: string) => {
    dispatch(switchSession(id))
    navigate('/xml-assist')
  }
  const newSession = () => {
    dispatch(startNewSession())
    navigate('/xml-assist')
  }

  return (
    <div className={cn('flex flex-col h-screen', darkMode && 'dark')}>
      <AppHeader />

      <ResizablePanelGroup
        orientation="horizontal"
        id="appshell-layout"
        className="flex-1 min-h-0"
      >
        <ResizablePanel
          id="sidebar"
          defaultSize={18}
          minSize={14}
          maxSize={32}
          className="bg-sidebar"
        >
          <aside className="flex flex-col h-full">
            <ScrollArea className="flex-1">
              <nav
                className="px-2 pb-2"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <SectionLabel>Navigate</SectionLabel>
                <div className="space-y-0.5">
                  {NAVIGATE.map((i) => (
                    <NavRow key={i.path} item={i} />
                  ))}
                </div>

                <SectionLabel>Workspaces</SectionLabel>
                <div className="space-y-0.5">
                  <WorkspaceGroup
                    label="AI Assistant"
                    icon={MessageSquare}
                    path="/assistant"
                    onNew={newChat}
                    items={recentThreads.map((t) => ({
                      id: t.id,
                      label: t.title,
                      active: t.id === activeThreadId,
                      onClick: () => openThread(t.id),
                      icon: MessageSquare,
                    }))}
                  />
                  <WorkspaceGroup
                    label="XML Assist"
                    icon={FileCode2}
                    path="/xml-assist"
                    onNew={newSession}
                    items={recentXmlSessions.map((s) => ({
                      id: s.id,
                      label: s.displayName,
                      active: s.id === activeXmlSessionId,
                      onClick: () => openSession(s.id),
                      icon: FileCode2,
                    }))}
                  />
                </div>

                <SectionLabel>Configuration</SectionLabel>
                <div className="space-y-0.5">
                  {CONFIGURATION.map((i) => (
                    <NavRow key={i.path} item={i} />
                  ))}
                </div>

                <SectionLabel>Account</SectionLabel>
                <div className="space-y-0.5">
                  {ACCOUNT.map((i) => (
                    <NavRow key={i.path} item={i} />
                  ))}
                </div>
              </nav>
            </ScrollArea>

            <div className="border-t border-border p-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.username || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || 'user@cognizant.com'}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel id="content" defaultSize={82} minSize={50}>
          <main className="h-full overflow-y-auto">{children}</main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

type WorkspaceItem = {
  id: string
  label: string
  active: boolean
  onClick: () => void
  icon: LucideIcon
}

function WorkspaceGroup({
  label,
  icon: Icon,
  path,
  onNew,
  items,
}: {
  label: string
  icon: LucideIcon
  path: string
  onNew: () => void
  items: WorkspaceItem[]
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center group">
        <NavLink
          to={path}
          end
          className={({ isActive }) => cn(navItemClasses({ isActive }), 'flex-1')}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="flex-1 truncate text-left">{label}</span>
        </NavLink>
        <button
          onClick={onNew}
          aria-label={`New ${label}`}
          className="ml-1 rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-accent hover:text-foreground transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {items.length > 0 && (
        <div className="ml-3 border-l border-border/60 pl-2 space-y-0.5">
          {items.map((it) => {
            const ItemIcon = it.icon
            return (
              <button
                key={it.id}
                onClick={it.onClick}
                className={cn(
                  'flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-xs text-left transition-colors',
                  it.active
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-accent/60 hover:text-foreground',
                )}
              >
                <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{it.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
