interface Env {
  ROOMS: KVNamespace
}

const TTL = 300  // 5 minutes

function cors(contentType?: string): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
  if (contentType) h['Content-Type'] = contentType
  return h
}

// GET /api/rooms?room=<id>&key=<offer|answer>
export async function onRequestGet(ctx: { request: Request; env: Env }) {
  const url = new URL(ctx.request.url)
  const room = url.searchParams.get('room')
  const key  = url.searchParams.get('key')
  if (!room || !key) {
    return new Response(JSON.stringify({ error: 'room and key required' }), {
      status: 400, headers: cors('application/json'),
    })
  }
  const value = await ctx.env.ROOMS.get(`room:${room}:${key}`)
  return new Response(JSON.stringify({ value }), {
    status: 200, headers: cors('application/json'),
  })
}

// PUT /api/rooms  body: { room, key, value }
export async function onRequestPut(ctx: { request: Request; env: Env }) {
  let body: { room?: string; key?: string; value?: string }
  try { body = await ctx.request.json() } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400, headers: cors('application/json'),
    })
  }
  const { room, key, value } = body
  if (!room || !key || typeof value !== 'string') {
    return new Response(JSON.stringify({ error: 'room, key, value required' }), {
      status: 400, headers: cors('application/json'),
    })
  }
  await ctx.env.ROOMS.put(`room:${room}:${key}`, value, { expirationTtl: TTL })
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: cors('application/json'),
  })
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() })
}
