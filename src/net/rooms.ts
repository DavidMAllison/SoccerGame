const BASE = '/api/rooms'

export async function writeRoom(room: string, key: string, value: string): Promise<void> {
  const res = await fetch(BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, key, value }),
  })
  if (!res.ok) throw new Error(`KV write failed: ${res.status}`)
}

export async function readRoom(room: string, key: string): Promise<string | null> {
  const res = await fetch(`${BASE}?room=${encodeURIComponent(room)}&key=${encodeURIComponent(key)}`)
  if (!res.ok) return null
  const json = await res.json() as { value: string | null }
  return json.value
}
