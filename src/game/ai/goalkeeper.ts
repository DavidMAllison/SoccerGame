import type { MatchState, Player, ControllerState } from '../types.js'
import { PITCH_Y, PITCH_H, GOAL_Y, GOAL_WIDTH, PITCH_W } from '../constants.js'
import { clamp } from './steering.js'

const KEEPER_DEPTH = 20  // how far from goal line the keeper stands

export function keeperControl(
  keeper: Player,
  state: MatchState,
  difficulty: 1 | 2 | 3,
): ControllerState {
  const { ball } = state
  const isLeft = keeper.team === 0   // team 0 defends left goal
  const goalX = isLeft ? KEEPER_DEPTH : PITCH_W - KEEPER_DEPTH
  const goalCY = GOAL_Y + GOAL_WIDTH / 2

  // Target Y: position between ball and goal centre, biased toward goal centre
  const ballInfluence = difficulty === 1 ? 0.3 : difficulty === 2 ? 0.5 : 0.7
  const targetY = goalCY * (1 - ballInfluence) + ball.pos.y * ballInfluence

  // Clamp to stay within a few tiles of goal
  const margin = GOAL_WIDTH * 0.8
  const clampedY = clamp(targetY, goalCY - margin, goalCY + margin)

  // Target X: stay near goal line but rush out if ball is very close
  const ballDistX = Math.abs(ball.pos.x - goalX)
  const rushThreshold = 60
  const targetX = ballDistX < rushThreshold
    ? goalX + (isLeft ? ballDistX * 0.4 : -ballDistX * 0.4)
    : goalX

  // Direction to target
  const dx = targetX - keeper.pos.x
  const dy = clampedY - keeper.pos.y
  const deadzone = difficulty === 1 ? 12 : 6

  const ctrl: ControllerState = {
    dx: Math.abs(dx) > deadzone ? Math.sign(dx) : 0,
    dy: Math.abs(dy) > deadzone ? Math.sign(dy) : 0,
    a: false,
    b: false,
  }

  // Kick ball away when possessed
  if (state.ball.owner === keeper.id) {
    ctrl.a = false
    ctrl.b = true  // shoot it clear
    // Aim toward centre of pitch, away from own goal
    keeper.facing.x = isLeft ? 1 : -1
    keeper.facing.y = (PITCH_Y + PITCH_H / 2 - keeper.pos.y) > 0 ? 0.3 : -0.3
  }

  return ctrl
}
