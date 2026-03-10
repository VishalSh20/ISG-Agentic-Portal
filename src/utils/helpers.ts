import { v4 as uuidv4 } from 'uuid'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function generateId(): string {
  return uuidv4()
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

export function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleString()
}
