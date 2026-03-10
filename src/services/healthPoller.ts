export function pollHealthStatus(
  entities: Array<{ id: string; healthEndpoint: string }>,
  onStatusUpdate: (id: string, status: 'online' | 'offline') => void,
  intervalMs: number = 30000
): () => void {
  let active = true
  let polling = false

  async function pollOnce() {
    if (polling) return
    polling = true
    const checks = entities.map(async (entity) => {
      try {
        const response = await fetch(entity.healthEndpoint, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        })
        onStatusUpdate(entity.id, response.ok ? 'online' : 'offline')
      } catch {
        onStatusUpdate(entity.id, 'offline')
      }
    })
    await Promise.allSettled(checks)
    polling = false
  }

  pollOnce()

  const intervalId = setInterval(() => {
    if (active) pollOnce()
  }, intervalMs)

  return () => {
    active = false
    clearInterval(intervalId)
  }
}
