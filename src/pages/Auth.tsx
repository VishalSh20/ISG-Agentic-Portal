import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import AppHeader from '@/components/layout/AppHeader'
import { useAppDispatch } from '@/store'
import { loginUser, registerUser } from '@/store/slices/authSlice'

// Generate SVG wave paths with varying amplitude and frequency
function generateWavePath(
  width: number,
  yCenter: number,
  amplitude: number,
  frequency: number,
  phase: number,
): string {
  const points: string[] = [`M 0 ${yCenter}`]
  const step = 10
  for (let x = 0; x <= width; x += step) {
    const y = yCenter + amplitude * Math.sin((x * frequency * Math.PI) / width + phase)
    points.push(`L ${x} ${y.toFixed(2)}`)
  }
  return points.join(' ')
}

const WAVE_COUNT = 7
const CANVAS_WIDTH = 1400
const CANVAS_HEIGHT = 600

const waves = Array.from({ length: WAVE_COUNT }, (_, i) => {
  const t = i / (WAVE_COUNT - 1) // 0 → 1
  return {
    yCenter: 180 + t * 240,
    amplitude: 18 + Math.sin(i * 1.3) * 12,
    frequency: 2 + t * 1.5,
    phase: i * 0.9,
    opacity: 0.12 + t * 0.14,
    strokeWidth: 1.5 + t * 0.5,
  }
})

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        if (!username.trim()) {
          toast.error('Username is required')
          return
        }
        await dispatch(registerUser({ email, password, username: username.trim() })).unwrap()
        toast.success('Account created!')
      } else {
        await dispatch(loginUser({ email, password })).unwrap()
        toast.success('Welcome back!')
      }
      navigate('/')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Auth error:',err)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <AppHeader />
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-background via-secondary to-accent">
      {/* Animated wavy lines background */}
      <svg
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {waves.map((w, i) => (
          <motion.path
            key={i}
            d={generateWavePath(CANVAS_WIDTH, w.yCenter, w.amplitude, w.frequency, w.phase)}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={w.strokeWidth}
            opacity={w.opacity}
            initial={{ pathOffset: 0, y: 0 }}
            animate={{ y: [0, -8, 0, 8, 0] }}
            transition={{
              duration: 6 + i * 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </svg>

      {/* Auth card */}
      <Card className="relative z-10 w-full max-w-sm border-border/50 bg-card/80 shadow-2xl backdrop-blur-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {mode === 'signin'
              ? 'Enter your credentials to continue'
              : 'Fill in the details to get started'}
          </CardDescription>
        </CardHeader>

        {/* Tab toggle */}
        <div className="mx-4 flex rounded-lg bg-muted p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'signin'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'signup'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
