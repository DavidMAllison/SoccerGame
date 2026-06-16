interface Env {
  METERED_API_KEY: string
}

function cors(contentType?: string): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
  if (contentType) h['Content-Type'] = contentType
  return h
}

// POST /api/turn  → returns fresh metered.ca TURN credentials
export async function onRequestPost(ctx: { env: Env }) {
  const { METERED_API_KEY: apiKey } = ctx.env
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'TURN not configured' }), {
      status: 503, headers: cors('application/json'),
    })
  }

  const res = await fetch(
    `https://soccer-game.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
  )

  if (!res.ok) {
    return new Response(JSON.stringify({ error: `upstream ${res.status}` }), {
      status: 502, headers: cors('application/json'),
    })
  }

  const data = await res.json()
  return new Response(JSON.stringify({ iceServers: data }), {
    status: 200, headers: cors('application/json'),
  })
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() })
}
