import type { Vec2 } from '../types.js'

// Returns a normalised direction vector from `from` toward `to`
export function seek(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 0.001) return { x: 0, y: 0 }
  return { x: dx / len, y: dy / len }
}

// Like seek but scales down when close (arrive behaviour)
export function arrive(from: Vec2, to: Vec2, slowRadius = 40): Vec2 {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 0.001) return { x: 0, y: 0 }
  const scale = Math.min(1, dist / slowRadius)
  return { x: (dx / dist) * scale, y: (dy / dist) * scale }
}

// Predict where the ball will be in `lookahead` seconds
export function interceptPoint(ballPos: Vec2, ballVel: Vec2, lookahead = 0.4): Vec2 {
  return {
    x: ballPos.x + ballVel.x * lookahead,
    y: ballPos.y + ballVel.y * lookahead,
  }
}

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
