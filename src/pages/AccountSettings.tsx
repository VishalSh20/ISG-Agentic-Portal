import { UserIcon, Moon, Sun, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAppDispatch, useAppSelector } from '@/store'
import { toggleDarkMode } from '@/store/slices/themeSlice'
import { updatePreferences, clearAuth } from '@/store/slices/authSlice'

export default function AccountSettings() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const darkMode = useAppSelector((s) => s.theme.darkMode)
  const agents = useAppSelector((s) => s.agents.agents)
  const workflows = useAppSelector((s) => s.workflows.workflows)

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
      </div>

      {/* Profile */}
      <Card className="border border-border">
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-medium text-foreground">{user?.username || 'User'}</p>
              <p className="text-sm text-muted-foreground">{user?.email || 'user@cognizant.com'}</p>
              <Badge variant="secondary" className="mt-1">{user?.role || 'USER'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="border border-border">
        <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
              <div>
                <Label>Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Toggle dark theme</p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={() => dispatch(toggleDarkMode())} />
          </div>
        </CardContent>
      </Card>

      {/* Defaults */}
      <Card className="border border-border">
        <CardHeader><CardTitle className="text-base">Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Agent</Label>
            <Select
              value={user?.preferences?.defaultAgentId || '_none'}
              onValueChange={(v) => dispatch(updatePreferences({ defaultAgentId: v === '_none' ? undefined : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Select default agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default Workflow</Label>
            <Select
              value={user?.preferences?.defaultWorkflowId || '_none'}
              onValueChange={(v) => dispatch(updatePreferences({ defaultWorkflowId: v === '_none' ? undefined : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Select default workflow" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {workflows.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Button variant="destructive" onClick={() => dispatch(clearAuth())}>
        <LogOut className="w-4 h-4 mr-2" /> Logout
      </Button>
    </div>
  )
}
