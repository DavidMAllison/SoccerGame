import type { Player, Ball, Missile, ControllerState } from '../types.js'
import {
  PLAYER_SPEED, PLAYER_ACCEL, PLAYER_FRICTION,
  PITCH_X, PITCH_Y, PITCH_W, PITCH_H, PLAYER_RADIUS,
  KICK_POWER, SHOOT_POWER, SHOOT_LOFT, KICK_COOLDOWN,
  SLIDE_SPEED, SLIDE_DURATION,
} from '../constants.js'

const DRIBBLE_SPEED_FACTOR = 0.80
const SLIDE_FRICTION = 0.92

export const MUSHROOM_SPEED_MULT = 2.0
export const MUSHROOM_DURATION  = 6    // seconds
export const BOMB_KNOCKBACK     = 220  // px/s
export const BOMB_STUN_DURATION = 1.8  // seconds

export const PIE_STUN_DURATION  = 2.0  // seconds
export const SLIME_SLOW_FACTOR  = 0.45 // multiplier on max speed
export const SLIME_DURATION     = 3.0  // seconds
export const MISSILE_SPEED      = 320  // px/s
export const MISSILE_LIFETIME   = 2.8  // seconds
export const MISSILE_BLAST_R    = 44   // px explosion radius
export const MISSILE_KNOCKBACK  = 260  // px/s
export const MISSILE_STUN       = 2.2  // seconds

export const DODGE_SPEED    = 200  // px/s burst
export const DODGE_DURATION = 0.22 // seconds of dash + tackle immunity
export const DODGE_COOLDOWN = 1.2  // seconds before next dodge

export function applyControl(player: Player, ctrl: ControllerState, dt: number) {
  if (player.pieTimer > 0) player.pieTimer -= dt
  if (player.slowTimer > 0) player.slowTimer -= dt
  if (player.dodgeTimer > 0) player.dodgeTimer -= dt
  if (player.dodgeCooldown > 0) player.dodgeCooldown -= dt
  if (player.stunTimer > 0) {
    player.stunTimer -= dt
    const f = Math.pow(SLIDE_FRICTION, dt * 60)
    player.vel.x *= f
    player.vel.y *= f
    player.pos.x += player.vel.x * dt
    player.pos.y += player.vel.y * dt
    clampToPitch(player)
    if (player.kickCooldown > 0) player.kickCooldown -= dt
    return
  }

  if (player.speedBoost > 0) player.speedBoost -= dt

  if (player.slideTimer > 0) {
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

  const boost = player.speedBoost > 0 ? MUSHROOM_SPEED_MULT : player.slowTimer > 0 ? SLIME_SLOW_FACTOR : 1
  const maxSpeed = player.dodgeTimer > 0
    ? DODGE_SPEED
    : (player.hasBall ? PLAYER_SPEED * DRIBBLE_SPEED_FACTOR : PLAYER_SPEED) * boost
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

let _nextMissileId = 0

export function tryFireMissile(player: Player, ctrl: ControllerState): Missile | null {
  if (!player.hasMissile) return null
  if (player.hasBall) return null
  if (player.stunTimer > 0) return null
  if (!ctrl.b) return null

  player.hasMissile = false
  return {
    id: _nextMissileId++,
    pos: { x: player.pos.x + player.facing.x * 12, y: player.pos.y + player.facing.y * 12 },
    vel: { x: player.facing.x * MISSILE_SPEED, y: player.facing.y * MISSILE_SPEED },
    ownerId: player.id,
    ownerTeam: player.team,
    lifetime: MISSILE_LIFETIME,
  }
}

export function tryDodge(player: Player, ctrl: ControllerState): boolean {
  if (!ctrl.c) return false
  if (player.dodgeCooldown > 0) return false
  if (player.stunTimer > 0) return false
  if (player.slideTimer > 0) return false

  let nx: number, ny: number
  if (ctrl.dx !== 0 || ctrl.dy !== 0) {
    const len = Math.sqrt(ctrl.dx * ctrl.dx + ctrl.dy * ctrl.dy)
    nx = ctrl.dx / len
    ny = ctrl.dy / len
  } else {
    // Standing still: sidestep perpendicular to facing
    nx = -player.facing.y
    ny = player.facing.x
  }

  player.vel.x = nx * DODGE_SPEED
  player.vel.y = ny * DODGE_SPEED
  player.facing.x = nx
  player.facing.y = ny
  player.dodgeTimer = DODGE_DURATION
  player.dodgeCooldown = DODGE_COOLDOWN
  return true
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
