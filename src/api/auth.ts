import { supabase } from '@/lib/supabase'
import type { User } from '@/types'

export async function signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })
  if (error) throw error

  // Create profile row (no trigger — we do it from the client)
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, username })
    if (profileError) throw profileError
  }

  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getProfile(userId: string): Promise<{ username: string; role: 'USER' | 'ADMIN' }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', userId)
    .single()
  if (error) throw error
  return { username: data.username, role: data.role as 'USER' | 'ADMIN' }
}

export function buildUser(
  id: string,
  email: string,
  profile: { username: string; role: 'USER' | 'ADMIN' },
): User {
  return {
    id,
    username: profile.username,
    email,
    role: profile.role,
    preferences: { darkMode: false },
  }
}
