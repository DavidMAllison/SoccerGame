interface Env {
  SCORES: KVNamespace
}

interface ScoreEntry {
  name: string
  score: number
  against: number
  date: string
}

const KV_KEY = 'leaderboard'
const MAX_ENTRIES = 10

async function getScores(env: Env): Promise<ScoreEntry[]> {
  const raw = await env.SCORES.get(KV_KEY)
  if (!raw) return []
  try { return JSON.parse(raw) as ScoreEntry[] } catch { return [] }
}

async function putScores(env: Env, scores: ScoreEntry[]) {
  await env.SCORES.put(KV_KEY, JSON.stringify(scores))
}

function isValidName(name: unknown): name is string {
  return typeof name === 'string' && /^[A-Z0-9]{1,3}$/.test(name)
}

function isPlausibleScore(score: unknown, against: unknown): boolean {
  return (
    typeof score === 'number' && score >= 0 && score <= 20 &&
    typeof against === 'number' && against >= 0 && against <= 20
  )
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers })
  }

  if (request.method === 'GET') {
    const scores = await getScores(env)
    return new Response(JSON.stringify(scores), { headers })
  }

  if (request.method === 'POST') {
    let body: unknown
    try { body = await request.json() } catch {
      return new Response(JSON.stringify({ error: 'bad json' }), { status: 400, headers })
    }

    const { name, score, against } = body as Record<string, unknown>

    if (!isValidName(name) || !isPlausibleScore(score, against)) {
      return new Response(JSON.stringify({ error: 'invalid' }), { status: 400, headers })
    }

    const entry: ScoreEntry = {
      name: name as string,
      score: score as number,
      against: against as number,
      date: new Date().toISOString().slice(0, 10),
    }

    const scores = await getScores(env)
    scores.push(entry)
    // Sort by score desc, keep top 10
    scores.sort((a, b) => b.score - a.score || a.against - b.against)
    const trimmed = scores.slice(0, MAX_ENTRIES)
    await putScores(env, trimmed)

    return new Response(JSON.stringify({ ok: true }), { headers })
  }

  return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers })
}
