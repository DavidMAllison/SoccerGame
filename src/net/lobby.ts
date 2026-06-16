import { writeRoom, readRoom } from './rooms.js'

export interface GameEntry {
  room: string
  team0: string; flag0: string
  team1: string; flag1: string
  ts: number
}

const INDEX_ROOM = '__LOBBY__'
const INDEX_KEY  = 'games'
const STALE_MS   = 90_000  // remove host after 90s of no heartbeat

export async function listGames(): Promise<GameEntry[]> {
  const raw = await readRoom(INDEX_ROOM, INDEX_KEY)
  if (!raw) return []
  try {
    const all = JSON.parse(raw) as GameEntry[]
    return all.filter(g => Date.now() - g.ts < STALE_MS)
  } catch { return [] }
}

export async function addGame(entry: GameEntry): Promise<void> {
  const games = await listGames()
  const rest = games.filter(g => g.room !== entry.room)
  rest.push(entry)
  await writeRoom(INDEX_ROOM, INDEX_KEY, JSON.stringify(rest))
}

export async function removeGame(room: string): Promise<void> {
  const games = await listGames()
  const rest = games.filter(g => g.room !== room)
  await writeRoom(INDEX_ROOM, INDEX_KEY, JSON.stringify(rest))
}
