import type { Player, Ball, CountryKit } from '../types.js'
import type { Camera } from '../systems/camera.js'

const SKIN      = '#e8b870'
const SKIN_DARK = '#c0904a'
const BOOT      = '#282828'

// Draws a top-down NES-style player at screen coords (sx, sy)
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: Player,
  cam: Camera,
  teamKits: [CountryKit, CountryKit],
) {
  const sx = Math.round(p.pos.x - cam.x)
  const sy = Math.round(p.pos.y)
  const kit = teamKits[p.team]
  const sliding = p.slideTimer > 0
  const angle = Math.atan2(p.facing.y, p.facing.x)

  ctx.save()
  ctx.translate(sx, sy)
  if (sliding) ctx.rotate(angle)

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  if (sliding) {
    ctx.ellipse(0, 5, 12, 3, 0, 0, Math.PI * 2)
  } else {
    ctx.ellipse(0, 7, 7, 2.5, 0, 0, Math.PI * 2)
  }
  ctx.fill()

  if (sliding) {
    // Sliding: flat elongated body
    ctx.fillStyle = kit.home
    ctx.fillRect(-10, -4, 20, 8)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(-10, -4, 4, 8)  // shorts patch
    // Boots sticking out
    ctx.fillStyle = BOOT
    ctx.fillRect(8, -5, 4, 4)
    ctx.fillRect(8, 1, 4, 4)
  } else {
    // Upright: jersey body
    ctx.fillStyle = kit.home
    ctx.fillRect(-5, -7, 10, 9)
    // Shirt number stripe (semi-transparent highlight)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(-2, -6, 4, 3)
    // Shorts
    ctx.fillStyle = kit.away
    ctx.fillRect(-5, 2, 10, 4)
    // Boots (two pixels)
    ctx.fillStyle = BOOT
    ctx.fillRect(-5, 6, 4, 4)
    ctx.fillRect(1, 6, 4, 4)
    // Head (rotated toward facing direction)
    const hx = Math.round(p.facing.x * 6)
    const hy = Math.round(p.facing.y * 5) - 8
    ctx.fillStyle = SKIN
    ctx.fillRect(hx - 3, hy - 3, 6, 6)
    ctx.fillStyle = SKIN_DARK
    ctx.fillRect(hx - 3, hy + 1, 6, 2)  // hair line
  }

  ctx.restore()

  // Active player triangle indicator — drawn in screen space above player
  if (p.isActive) {
    ctx.fillStyle = '#ffff00'
    ctx.beginPath()
    ctx.moveTo(sx,     sy - 14)
    ctx.lineTo(sx - 4, sy - 20)
    ctx.lineTo(sx + 4, sy - 20)
    ctx.closePath()
    ctx.fill()
    // Black outline on triangle
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }
}

export function drawBall(ctx: CanvasRenderingContext2D, ball: Ball, cam: Camera) {
  const gx = Math.round(ball.pos.x - cam.x)  // ground position
  const gy = Math.round(ball.pos.y)
  const sx = gx
  const sy = Math.round(ball.pos.y - ball.z)  // visual position with loft

  // Ground shadow (at ground position, gets faint as ball lifts)
  const shadowAlpha = Math.max(0.05, 0.35 - ball.z * 0.008)
  ctx.fillStyle = `rgba(0,0,0,${shadowAlpha.toFixed(2)})`
  ctx.beginPath()
  ctx.ellipse(gx, gy + 2, 5, 2, 0, 0, Math.PI * 2)
  ctx.fill()

  // Ball: NES-style — white with black hex panel lines
  ctx.fillStyle = '#f8f8f8'
  ctx.fillRect(sx - 4, sy - 4, 8, 8)

  // Black border
  ctx.fillStyle = '#101010'
  ctx.fillRect(sx - 4, sy - 4, 8, 1)  // top
  ctx.fillRect(sx - 4, sy + 3, 8, 1)  // bottom
  ctx.fillRect(sx - 4, sy - 4, 1, 8)  // left
  ctx.fillRect(sx + 3, sy - 4, 1, 8)  // right

  // Panel lines (cross)
  ctx.fillStyle = '#888888'
  ctx.fillRect(sx - 1, sy - 3, 2, 6)
  ctx.fillRect(sx - 3, sy - 1, 6, 2)

  // Centre pixel
  ctx.fillStyle = '#101010'
  ctx.fillRect(sx - 1, sy - 1, 2, 2)
}
