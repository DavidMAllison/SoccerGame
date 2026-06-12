import type { Player, Ball, ControllerState } from '../types.js'
import {
  PLAYER_SPEED, PLAYER_ACCEL, PLAYER_FRICTION,
  PITCH_X, PITCH_Y, PITCH_W, PITCH_H, PLAYER_RADIUS,
  KICK_POWER, SHOOT_POWER, SHOOT_LOFT, KICK_COOLDOWN,
  SLIDE_SPEED, SLIDE_DURATION,
} from '../constants.js'

const DRIBBLE_SPEED_FACTOR = 0.80
const SLIDE_FRICTION = 0.92  // slower deceleration mid-slide

export function applyControl(player: Player, ctrl: ControllerState, dt: number) {
  if (player.slideTimer > 0) {
    // Sliding: ignore directional input, just decelerate
    player.slideTimer -= dt
    const f = Math.pow(SLIDE_FRICTION, dt * 60)
    player.vel.x *= f
    player.vel.y *= f
    player.pos.x += player.vel.x * dt
    player.pos.y += player.vel.y * dt
    clampToPitch(player)
    if (player.kickCooldown > 0) player.kickCooldown -= dt
    return
  }

  if (ctrl.dx !== 0 || ctrl.dy !== 0) {
    const len = Math.sqrt(ctrl.dx * ctrl.dx + ctrl.dy * ctrl.dy)
    const nx = ctrl.dx / len
    const ny = ctrl.dy / len
    player.vel.x += nx * PLAYER_ACCEL * dt
    player.vel.y += ny * PLAYER_ACCEL * dt
    player.facing.x = nx
    player.facing.y = ny
  }

  const maxSpeed = player.hasBall ? PLAYER_SPEED * DRIBBLE_SPEED_FACTOR : PLAYER_SPEED
  const speed = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2)
  if (speed > maxSpeed) {
    player.vel.x = (player.vel.x / speed) * maxSpeed
    player.vel.y = (player.vel.y / speed) * maxSpeed
  }

  applyFrictionAndMove(player, dt)

  if (player.kickCooldown > 0) player.kickCooldown -= dt
}

export function tryKick(
  player: Player,
  ball: Ball,
  ctrl: ControllerState,
): 'kick' | 'shoot' | null {
  if (ball.owner !== player.id) return null
  if (player.kickCooldown > 0) return null

  if (ctrl.a) {
    releaseBall(player, ball, KICK_POWER, 0)
    return 'kick'
  }
  if (ctrl.b) {
    // Redirect shot toward opponent goal if facing wrong way
    const ownGoalDir = player.team === 0 ? -1 : 1
    if (Math.sign(player.facing.x) === ownGoalDir || Math.abs(player.facing.x) < 0.1) {
      player.facing.x = -ownGoalDir * 0.85
      player.facing.y = Math.sign(player.facing.y) * 0.53
    }
    releaseBall(player, ball, SHOOT_POWER, SHOOT_LOFT)
    return 'shoot'
  }
  return null
}

export function trySlide(player: Player, ctrl: ControllerState): boolean {
  if (player.hasBall) return false
  if (player.slideTimer > 0) return false
  if (player.kickCooldown > 0) return false
  if (!ctrl.b) return false

  player.slideTimer = SLIDE_DURATION
  player.vel.x = player.facing.x * SLIDE_SPEED
  player.vel.y = player.facing.y * SLIDE_SPEED
  player.kickCooldown = KICK_COOLDOWN
  return true
}

export function applyFrictionAndMove(player: Player, dt: number) {
  const f = Math.pow(PLAYER_FRICTION, dt * 60)
  player.vel.x *= f
  player.vel.y *= f
  player.pos.x += player.vel.x * dt
  player.pos.y += player.vel.y * dt
  clampToPitch(player)
}

function clampToPitch(player: Player) {
  player.pos.x = Math.max(PITCH_X + PLAYER_RADIUS, Math.min(PITCH_X + PITCH_W - PLAYER_RADIUS, player.pos.x))
  player.pos.y = Math.max(PITCH_Y + PLAYER_RADIUS, Math.min(PITCH_Y + PITCH_H - PLAYER_RADIUS, player.pos.y))
}

function releaseBall(player: Player, ball: Ball, power: number, loft: number) {
  ball.owner = null
  player.hasBall = false
  ball.vel.x = player.facing.x * power
  ball.vel.y = player.facing.y * power
  ball.z = 0
  ball.vz = loft
  player.kickCooldown = KICK_COOLDOWN
}
