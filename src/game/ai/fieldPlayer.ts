import type { MatchState, Player, ControllerState } from '../types.js'
import { PITCH_W, PITCH_H, PITCH_Y, GOAL_Y, GOAL_WIDTH } from '../constants.js'
import type { Role } from './coordinator.js'
import { seek, interceptPoint, dist, clamp } from './steering.js'

const ATTACK_GOAL_Y = GOAL_Y + GOAL_WIDTH / 2  // centre of opponent's goal

export function fieldPlayerControl(
  player: Player,
  role: Role,
  state: MatchState,
  difficulty: 1 | 2 | 3,
): ControllerState {
  const { ball } = state

  // Reaction delay: easy AI randomly ignores input some ticks
  if (difficulty === 1 && Math.random() < 0.18) {
    return { dx: 0, dy: 0, a: false, b: false }
  }

  // If this player has the ball: decide to kick or dribble
  if (ball.owner === player.id) {
    return withBallControl(player, state, difficulty)
  }

  switch (role) {
    case 'chaser':  return chaserControl(player, state, difficulty)
    case 'support': return supportControl(player, state, difficulty)
    case 'defend':  return defendControl(player, state, difficulty)
    default:        return { dx: 0, dy: 0, a: false, b: false }
  }
}

function withBallControl(
  player: Player,
  _state: MatchState,
  difficulty: 1 | 2 | 3,
): ControllerState {
  const attackGoalX = player.team === 0 ? PITCH_W : 0
  const target = { x: attackGoalX, y: ATTACK_GOAL_Y }

  // Point toward goal
  const dir = seek(player.pos, target)
  player.facing.x = dir.x
  player.facing.y = dir.y

  // How close to goal (normalised 0-1)
  const proximity = 1 - clamp(dist(player.pos, target) / PITCH_W, 0, 1)
  // Threshold chosen so ball friction doesn't kill the shot before it reaches goal:
  // max horiz range ≈ 178px; threshold 0.70 → fires within 154px ✓
  const shootThreshold = difficulty === 3 ? 0.60 : difficulty === 2 ? 0.65 : 0.70

  return {
    dx: dir.x,
    dy: dir.y,
    a: false,
    b: proximity > shootThreshold,  // B = shoot
  }
}

function chaserControl(
  player: Player,
  state: MatchState,
  _difficulty: 1 | 2 | 3,
): ControllerState {
  const { ball } = state

  // Chase predicted ball position if it's moving
  const speed = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2)
  const target = speed > 20
    ? interceptPoint(ball.pos, ball.vel, 0.3)
    : ball.pos

  const dir = seek(player.pos, target)
  return { dx: dir.x, dy: dir.y, a: false, b: false }
}

function supportControl(
  player: Player,
  state: MatchState,
  _difficulty: 1 | 2 | 3,
): ControllerState {
  const { ball } = state
  const attackGoalX = player.team === 0 ? PITCH_W : 0

  // Position in the attacking half, offset laterally from ball
  const lateral = player.id % 2 === 0 ? 40 : -40  // alternate sides
  const target = {
    x: clamp(ball.pos.x + (attackGoalX > 256 ? 60 : -60), 40, PITCH_W - 40),
    y: clamp(ball.pos.y + lateral, PITCH_Y + 20, PITCH_Y + PITCH_H - 20),
  }

  const dir = seek(player.pos, target)
  const close = dist(player.pos, target) < 15
  return { dx: close ? 0 : dir.x, dy: close ? 0 : dir.y, a: false, b: false }
}

function defendControl(
  player: Player,
  state: MatchState,
  _difficulty: 1 | 2 | 3,
): ControllerState {
  const { ball } = state
  const ownGoalX = player.team === 0 ? 0 : PITCH_W
  const cy = PITCH_Y + PITCH_H / 2

  // Stay in defensive third, between ball and goal
  const targetX = clamp(
    (ball.pos.x + ownGoalX) / 2,
    player.team === 0 ? 20 : PITCH_W / 2,
    player.team === 0 ? PITCH_W / 2 : PITCH_W - 20,
  )
  const targetY = clamp(ball.pos.y * 0.5 + cy * 0.5, PITCH_Y + 20, PITCH_Y + PITCH_H - 20)

  const dir = seek(player.pos, { x: targetX, y: targetY })
  const close = dist(player.pos, { x: targetX, y: targetY }) < 10
  return { dx: close ? 0 : dir.x, dy: close ? 0 : dir.y, a: false, b: false }
}
