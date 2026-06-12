export interface ScoreEntry {
  name: string
  score: number
  against: number
  date: string
}

export async function fetchScores(): Promise<ScoreEntry[]> {
  try {
    const res = await fetch('/api/scores')
    if (!res.ok) return []
    return await res.json() as ScoreEntry[]
  } catch { return [] }
}

export async function submitScore(name: string, score: number, against: number): Promise<boolean> {
  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.toUpperCase().slice(0, 3), score, against }),
    })
    return res.ok
  } catch { return false }
}
