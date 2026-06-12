export interface SimResult {
  playerName: string
  matchId: string
  team0: string
  team1: string
  score0: number
  score1: number
  playedAs: 0 | 1
  ts: number
}

export async function submitSimulation(result: SimResult): Promise<void> {
  await fetch('/api/simulations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  })
}

export async function fetchSimulations(matchId: string): Promise<SimResult[]> {
  const res = await fetch(`/api/simulations?match=${encodeURIComponent(matchId)}`)
  if (!res.ok) return []
  return res.json()
}
