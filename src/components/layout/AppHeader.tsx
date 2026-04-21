import { NavLink } from 'react-router-dom'
import { Moon, Sun, UserIcon, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppDispatch, useAppSelector } from '@/store'
import { toggleDarkMode } from '@/store/slices/themeSlice'
import { logoutUser } from '@/store/slices/authSlice'

export default function AppHeader() {
  const dispatch = useAppDispatch()
  const darkMode = useAppSelector((s) => s.theme.darkMode)
  const user = useAppSelector((s) => s.auth.user)
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)

  return (
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

        {isAuthenticated && (
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
              <DropdownMenuItem onClick={() => dispatch(logoutUser())} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
