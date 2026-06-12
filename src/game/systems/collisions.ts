import type { MatchState } from '../types.js'
import { POSSESSION_RADIUS, PLAYER_RADIUS, BALL_RADIUS } from '../constants.js'

export function lockBallToOwner(state: MatchState) {
  const { ball, players } = state
  if (ball.owner === null) return

  const owner = players.find(p => p.id === ball.owner)
  if (!owner) { ball.owner = null; return }

  // Ball sits just ahead of player in facing direction
  ball.pos.x = owner.pos.x + owner.facing.x * (PLAYER_RADIUS + BALL_RADIUS + 1)
  ball.pos.y = owner.pos.y + owner.facing.y * (PLAYER_RADIUS + BALL_RADIUS + 1)
  ball.vel.x = 0
  ball.vel.y = 0
  ball.z = 0
  ball.vz = 0
}

export function checkPossession(state: MatchState) {
  const { ball, players } = state
  if (ball.owner !== null) return  // already owned

  let nearestId = -1
  let nearestDist = POSSESSION_RADIUS

  for (const p of players) {
    if (p.kickCooldown > 0) continue  // can't recapture immediately after kicking
    const dx = p.pos.x - ball.pos.x
    const dy = p.pos.y - ball.pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < nearestDist) {
      nearestDist = dist
      nearestId = p.id
    }
  }

  if (nearestId >= 0) {
    // Clear hasBall from anyone who had it
    for (const p of players) p.hasBall = false
    ball.owner = nearestId
    players.find(p => p.id === nearestId)!.hasBall = true
  }
}
