import type { MatchState } from '../types.js'
import {
  BALL_FRICTION, BALL_BOUNCE, BALL_RADIUS,
  PITCH_X, PITCH_Y, PITCH_W, PITCH_H,
  GOAL_Y, GOAL_WIDTH, CROSSBAR_H,
} from '../constants.js'

const GRAVITY = 260  // px/s²

export type GoalEvent = 'goal0' | 'goal1' | null  // team that conceded

export function tickBall(state: MatchState, dt: number): GoalEvent {
  const { ball } = state
  if (ball.owner !== null) return null  // owned: locked to player, physics skipped

  // Ground friction
  ball.vel.x *= Math.pow(BALL_FRICTION, dt * 60)
  ball.vel.y *= Math.pow(BALL_FRICTION, dt * 60)

  ball.pos.x += ball.vel.x * dt
  ball.pos.y += ball.vel.y * dt

  // Loft / gravity
  if (ball.z > 0 || ball.vz !== 0) {
    ball.vz -= GRAVITY * dt
    ball.z += ball.vz * dt
    if (ball.z <= 0) {
      ball.z = 0
      ball.vz *= -0.45  // ground bounce, lose energy
      if (Math.abs(ball.vz) < 8) ball.vz = 0
    }
  }

  // Top/bottom walls
  if (ball.pos.y - BALL_RADIUS < PITCH_Y) {
    ball.pos.y = PITCH_Y + BALL_RADIUS
    ball.vel.y = Math.abs(ball.vel.y) * BALL_BOUNCE
  }
  if (ball.pos.y + BALL_RADIUS > PITCH_Y + PITCH_H) {
    ball.pos.y = PITCH_Y + PITCH_H - BALL_RADIUS
    ball.vel.y = -Math.abs(ball.vel.y) * BALL_BOUNCE
  }

  // Left end line — goal opening or wall bounce
  if (ball.pos.x - BALL_RADIUS < PITCH_X) {
    const inGoal = ball.pos.y >= GOAL_Y && ball.pos.y <= GOAL_Y + GOAL_WIDTH && ball.z <= CROSSBAR_H
    if (inGoal) return 'goal1'  // ball entered left goal → team 1 scored
    ball.pos.x = PITCH_X + BALL_RADIUS
    ball.vel.x = Math.abs(ball.vel.x) * BALL_BOUNCE
  }

  // Right end line
  if (ball.pos.x + BALL_RADIUS > PITCH_X + PITCH_W) {
    const inGoal = ball.pos.y >= GOAL_Y && ball.pos.y <= GOAL_Y + GOAL_WIDTH && ball.z <= CROSSBAR_H
    if (inGoal) return 'goal0'  // ball entered right goal → team 0 scored
    ball.pos.x = PITCH_X + PITCH_W - BALL_RADIUS
    ball.vel.x = -Math.abs(ball.vel.x) * BALL_BOUNCE
  }

  return null
}
