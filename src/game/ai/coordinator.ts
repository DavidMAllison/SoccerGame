import type { MatchState } from '../types.js'
import { dist } from './steering.js'

export type Role = 'keeper' | 'chaser' | 'support' | 'defend'

export type RoleMap = Map<number, Role>

// Re-assigns roles to team's players based on world state.
// Called at ~10Hz (every 6 ticks) to keep coordinator cheap.
export function assignRoles(state: MatchState, team: 0 | 1): RoleMap {
  const roles = new Map<number, Role>()
  const teamPlayers = state.players.filter(p => p.team === team)
  const keeper = teamPlayers.find(p => p.isKeeper)!
  const field = teamPlayers.filter(p => !p.isKeeper)

  roles.set(keeper.id, 'keeper')

  // Closest field player to ball becomes chaser (unless opponent owns ball deep in attack)
  const sorted = [...field].sort((a, b) =>
    dist(a.pos, state.ball.pos) - dist(b.pos, state.ball.pos)
  )

  roles.set(sorted[0].id, 'chaser')

  // Defensive half: who is closest to own goal
  const ownGoalX = team === 0 ? 0 : 512
  const defSorted = sorted.slice(1).sort((a, b) =>
    Math.abs(a.pos.x - ownGoalX) - Math.abs(b.pos.x - ownGoalX)
  )

  // Closest to own goal → defend, rest → support
  if (defSorted.length > 0) roles.set(defSorted[0].id, 'defend')
  for (let i = 1; i < defSorted.length; i++) roles.set(defSorted[i].id, 'support')

  return roles
}
