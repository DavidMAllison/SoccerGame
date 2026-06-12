interface Env {
  SIMS: KVNamespace
}

interface SimResult {
  playerName: string
  matchId: string
  team0: string
  team1: string
  score0: number
  score1: number
  playedAs: 0 | 1
  ts: number
}

// GET /api/simulations?match=A1
// Returns the last 20 simulation results for a given matchId, newest first
export async function onRequestGet(ctx: { request: Request; env: Env }) {
  const url = new URL(ctx.request.url)
  const matchId = url.searchParams.get('match')
  if (!matchId) {
    return new Response(JSON.stringify({ error: 'match param required' }), {
      status: 400, headers: corsHeaders('application/json'),
    })
  }

  const prefix = `sim:${matchId}:`
  const list = await ctx.env.SIMS.list({ prefix, limit: 100 })

  // Batch fetch all values in parallel
  const entries = await Promise.all(
    list.keys.map(k => ctx.env.SIMS.get(k.name))
  )

  const results: SimResult[] = entries
    .filter((v): v is string => v !== null)
    .map(v => JSON.parse(v) as SimResult)
    .sort((a, b) => b.ts - a.ts)  // newest first
    .slice(0, 20)

  return new Response(JSON.stringify(results), {
    status: 200, headers: corsHeaders('application/json'),
  })
}

// POST /api/simulations
// Body: SimResult (score is client-side — trusted for personal pool use)
export async function onRequestPost(ctx: { request: Request; env: Env }) {
  let body: Partial<SimResult>
  try {
    body = await ctx.request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400, headers: corsHeaders('application/json'),
    })
  }

  const { playerName, matchId, team0, team1, score0, score1, playedAs } = body

  if (
    typeof playerName !== 'string' || playerName.length < 1 || playerName.length > 20 ||
    typeof matchId !== 'string' || matchId.length < 1 ||
    typeof team0 !== 'string' || typeof team1 !== 'string' ||
    typeof score0 !== 'number' || typeof score1 !== 'number' ||
    (playedAs !== 0 && playedAs !== 1)
  ) {
    return new Response(JSON.stringify({ error: 'invalid payload' }), {
      status: 400, headers: corsHeaders('application/json'),
    })
  }

  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 6)
  const key = `sim:${matchId}:${ts}:${rand}`

  const record: SimResult = {
    playerName: playerName.trim().slice(0, 20),
    matchId, team0, team1,
    score0: Math.max(0, Math.min(99, Math.round(score0))),
    score1: Math.max(0, Math.min(99, Math.round(score1))),
    playedAs: playedAs as 0 | 1,
    ts,
  }

  await ctx.env.SIMS.put(key, JSON.stringify(record))

  return new Response(JSON.stringify({ ok: true }), {
    status: 201, headers: corsHeaders('application/json'),
  })
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

function corsHeaders(contentType?: string): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
  if (contentType) h['Content-Type'] = contentType
  return h
}
