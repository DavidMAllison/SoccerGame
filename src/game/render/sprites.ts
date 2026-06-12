import type { Player, Ball, CountryKit } from '../types.js'
import type { Camera } from '../systems/camera.js'
import type { Vec2 } from '../types.js'

const BOOT = '#282828'

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
    drawSliding(ctx, p.skin, kit)
  } else {
    const hx = Math.round(p.facing.x * 6)
    const hy = Math.round(p.facing.y * 5) - 8
    drawUpright(ctx, p.skin, kit, hx, hy, p.facing)
  }

  ctx.restore()

  // Active player yellow triangle above
  if (p.isActive) {
    ctx.fillStyle = '#ffff00'
    ctx.beginPath()
    ctx.moveTo(sx,     sy - 14)
    ctx.lineTo(sx - 4, sy - 20)
    ctx.lineTo(sx + 4, sy - 20)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }
}

// ─── Sliding (all skins share a flat pose, using skin-specific colours) ──────

function drawSliding(ctx: CanvasRenderingContext2D, skin: number, kit: CountryKit) {
  const bodyColor = skinBodyColor(skin, kit)
  ctx.fillStyle = bodyColor
  ctx.fillRect(-10, -4, 20, 8)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(-10, -4, 4, 8)
  ctx.fillStyle = kit.home  // team-coloured boot
  ctx.fillRect(8, -5, 4, 4)
  ctx.fillRect(8, 1, 4, 4)
}

function skinBodyColor(skin: number, kit: CountryKit): string {
  if (skin === 4) return '#388E3C'         // Creeper — always green body
  if (skin === 6) return '#1A1A2E'         // Ninja — always dark
  return kit.home
}

// ─── Upright dispatch ─────────────────────────────────────────────────────────

function drawUpright(
  ctx: CanvasRenderingContext2D,
  skin: number,
  kit: CountryKit,
  hx: number,
  hy: number,
  facing: Vec2,
) {
  switch (skin) {
    case 1: drawMinecraft(ctx, kit, hx, hy); break
    case 2: drawRoblox(ctx, kit, hx, hy); break
    case 3: drawAmongUs(ctx, kit, hx, hy, facing); break
    case 4: drawCreeper(ctx, kit, hx, hy); break
    case 5: drawMario(ctx, kit, hx, hy); break
    case 6: drawNinja(ctx, kit, hx, hy); break
    case 7: drawAlien(ctx, kit, hx, hy); break
    default: drawClassic(ctx, kit, hx, hy); break
  }

  // Team-coloured boots drawn last — consistent team ID across all skins
  ctx.fillStyle = kit.home
  ctx.fillRect(-5, 6, 4, 4)
  ctx.fillRect(1, 6, 4, 4)
}

// ─── Skin 0: Classic NES ──────────────────────────────────────────────────────

function drawClassic(ctx: CanvasRenderingContext2D, kit: CountryKit, hx: number, hy: number) {
  ctx.fillStyle = kit.home
  ctx.fillRect(-5, -7, 10, 9)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillRect(-2, -6, 4, 3)
  ctx.fillStyle = kit.away
  ctx.fillRect(-5, 2, 10, 4)
  ctx.fillStyle = BOOT
  ctx.fillRect(-5, 6, 4, 4)
  ctx.fillRect(1, 6, 4, 4)
  // Head
  ctx.fillStyle = '#e8b870'
  ctx.fillRect(hx - 3, hy - 3, 6, 6)
  ctx.fillStyle = '#c0904a'
  ctx.fillRect(hx - 3, hy + 1, 6, 2)
}

// ─── Skin 1: Minecraft Steve ──────────────────────────────────────────────────

function drawMinecraft(ctx: CanvasRenderingContext2D, kit: CountryKit, hx: number, hy: number) {
  // Body — kit shirt, very blocky
  ctx.fillStyle = kit.home
  ctx.fillRect(-5, -7, 10, 9)
  // Shorts
  ctx.fillStyle = kit.away
  ctx.fillRect(-5, 2, 5, 5)
  ctx.fillRect(0, 2, 5, 5)
  // Boots — dark grey
  ctx.fillStyle = '#555555'
  ctx.fillRect(-5, 7, 5, 3)
  ctx.fillRect(0, 7, 5, 3)
  // Head — 8×8 square, tan skin
  ctx.fillStyle = '#C8A87C'
  ctx.fillRect(hx - 4, hy - 4, 8, 8)
  // Brown hair strip across top
  ctx.fillStyle = '#4A2E0A'
  ctx.fillRect(hx - 4, hy - 4, 8, 3)
  // Eyes — two 2×2 dark pixels
  ctx.fillStyle = '#1A0A00'
  ctx.fillRect(hx - 3, hy, 2, 2)
  ctx.fillRect(hx + 1, hy, 2, 2)
}

// ─── Skin 2: Roblox Noob ─────────────────────────────────────────────────────

function drawRoblox(ctx: CanvasRenderingContext2D, kit: CountryKit, hx: number, hy: number) {
  // Body — kit shirt
  ctx.fillStyle = kit.home
  ctx.fillRect(-5, -7, 10, 9)
  // Shorts
  ctx.fillStyle = kit.away
  ctx.fillRect(-5, 2, 10, 5)
  // Boots
  ctx.fillStyle = BOOT
  ctx.fillRect(-5, 7, 4, 3)
  ctx.fillRect(1, 7, 4, 3)
  // Head — iconic bright yellow square
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(hx - 4, hy - 4, 8, 8)
  // Black outline on head
  ctx.fillStyle = '#000000'
  ctx.fillRect(hx - 4, hy - 4, 8, 1)  // top edge
  ctx.fillRect(hx - 4, hy + 3, 8, 1)  // bottom edge
  // Dot eyes
  ctx.fillRect(hx - 2, hy - 1, 1, 2)
  ctx.fillRect(hx + 1, hy - 1, 1, 2)
  // Smile
  ctx.fillRect(hx - 1, hy + 1, 3, 1)
}

// ─── Skin 3: Among Us crewmate ────────────────────────────────────────────────

function drawAmongUs(
  ctx: CanvasRenderingContext2D,
  kit: CountryKit,
  hx: number,
  hy: number,
  facing: Vec2,
) {
  // Bean body — all kit.home color, rounder shape approximated with rects
  ctx.fillStyle = kit.home
  ctx.fillRect(-4, -9, 8, 16)   // tall center column
  ctx.fillRect(-5, -6, 10, 10)  // wider middle
  ctx.fillRect(-3, -10, 6, 2)   // rounded head top
  ctx.fillRect(-3, 7, 6, 1)     // rounded foot bottom

  // Backpack bump — on the opposite side of facing
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  const bx = -Math.sign(facing.x || 1) * 5
  ctx.fillRect(bx - 1, -4, 3, 7)

  // Visor — cyan strip at head area (offset toward facing direction)
  ctx.fillStyle = '#40C4FF'
  ctx.fillRect(hx - 3, hy - 1, 6, 3)
  // Visor highlight
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillRect(hx - 2, hy - 1, 2, 1)
}

// ─── Skin 4: Creeper ─────────────────────────────────────────────────────────

function drawCreeper(ctx: CanvasRenderingContext2D, _kit: CountryKit, hx: number, hy: number) {
  // Body — all green (ignores kit for full creeper effect)
  ctx.fillStyle = '#4CAF50'
  ctx.fillRect(-5, -7, 10, 14)
  // Leg split
  ctx.fillStyle = '#388E3C'
  ctx.fillRect(-1, 4, 2, 4)  // gap between legs
  // Head — 8×8 green square
  ctx.fillStyle = '#4CAF50'
  ctx.fillRect(hx - 4, hy - 4, 8, 8)
  // Creeper face: iconic eyes + grimace mouth
  ctx.fillStyle = '#1A1A00'
  // Eyes (2×2 each)
  ctx.fillRect(hx - 3, hy - 2, 2, 2)
  ctx.fillRect(hx + 1, hy - 2, 2, 2)
  // Nose pixel (centre, between eyes)
  ctx.fillRect(hx - 1, hy, 2, 1)
  // Grimace mouth — downward T shape
  ctx.fillRect(hx - 2, hy + 1, 2, 2)  // left drop
  ctx.fillRect(hx,     hy + 1, 2, 1)  // centre bridge
  ctx.fillRect(hx,     hy + 2, 2, 2)  // right drop
}

// ─── Skin 5: Mario ───────────────────────────────────────────────────────────

function drawMario(ctx: CanvasRenderingContext2D, kit: CountryKit, hx: number, hy: number) {
  // Overalls — kit.away color
  ctx.fillStyle = kit.away
  ctx.fillRect(-5, -7, 10, 14)
  // Shirt — kit.home (visible as chest strip)
  ctx.fillStyle = kit.home
  ctx.fillRect(-4, -5, 8, 5)
  // Boots — dark brown
  ctx.fillStyle = '#5C3A1E'
  ctx.fillRect(-5, 7, 5, 3)
  ctx.fillRect(0, 7, 5, 3)
  // Suspender straps
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(-2, -7, 2, 7)
  ctx.fillRect(0, -7, 2, 7)
  // Head — skin-coloured face
  ctx.fillStyle = '#FDBCB4'
  ctx.fillRect(hx - 3, hy - 1, 7, 5)
  // Red cap — wider brim
  ctx.fillStyle = '#C41E1E'
  ctx.fillRect(hx - 4, hy - 5, 9, 4)
  ctx.fillRect(hx - 5, hy - 2, 11, 1)  // brim
  // White "M" dots on cap (simplified as two white pixels)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(hx - 2, hy - 4, 2, 2)
  ctx.fillRect(hx + 1, hy - 4, 2, 2)
  // Moustache — dark strip below nose
  ctx.fillStyle = '#2C1500'
  ctx.fillRect(hx - 2, hy + 2, 6, 1)
}

// ─── Skin 6: Ninja ───────────────────────────────────────────────────────────

function drawNinja(ctx: CanvasRenderingContext2D, kit: CountryKit, hx: number, hy: number) {
  // Dark body (ninja blacks)
  ctx.fillStyle = '#1A1A2E'
  ctx.fillRect(-5, -7, 10, 14)
  // Sash / belt in kit.home accent
  ctx.fillStyle = kit.home
  ctx.fillRect(-5, 0, 10, 2)
  // Boots — very dark
  ctx.fillStyle = '#0D0D1A'
  ctx.fillRect(-5, 7, 5, 3)
  ctx.fillRect(0, 7, 5, 3)
  // Head wrap — dark with just eyes visible
  ctx.fillStyle = '#1A1A2E'
  ctx.fillRect(hx - 4, hy - 4, 8, 8)
  // Headband — kit.home color stripe across middle of head
  ctx.fillStyle = kit.home
  ctx.fillRect(hx - 4, hy - 1, 8, 2)
  // Eyes — only visible whites above headband
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(hx - 3, hy - 3, 2, 2)
  ctx.fillRect(hx + 1, hy - 3, 2, 2)
  // Pupil dots
  ctx.fillStyle = '#000000'
  ctx.fillRect(hx - 2, hy - 2, 1, 1)
  ctx.fillRect(hx + 2, hy - 2, 1, 1)
}

// ─── Skin 7: Alien ───────────────────────────────────────────────────────────

function drawAlien(ctx: CanvasRenderingContext2D, kit: CountryKit, hx: number, hy: number) {
  // Body — grey/silver suit with kit accent
  ctx.fillStyle = '#78909C'
  ctx.fillRect(-5, -7, 10, 14)
  // Kit colour chest panel
  ctx.fillStyle = kit.home
  ctx.fillRect(-3, -5, 6, 6)
  // Boots — dark grey
  ctx.fillStyle = '#455A64'
  ctx.fillRect(-5, 7, 5, 3)
  ctx.fillRect(0, 7, 5, 3)
  // Oversized oval head — lime green
  ctx.fillStyle = '#76FF03'
  ctx.fillRect(hx - 5, hy - 5, 10, 9)
  // Round it off slightly at corners (darken corners)
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(hx - 5, hy - 5, 1, 1)
  ctx.fillRect(hx + 4, hy - 5, 1, 1)
  ctx.fillRect(hx - 5, hy + 3, 1, 1)
  ctx.fillRect(hx + 4, hy + 3, 1, 1)
  // Large black almond eyes
  ctx.fillStyle = '#000000'
  ctx.fillRect(hx - 4, hy - 3, 3, 4)
  ctx.fillRect(hx + 1, hy - 3, 3, 4)
  // Green pupils inside eyes
  ctx.fillStyle = '#B2FF59'
  ctx.fillRect(hx - 3, hy - 2, 1, 2)
  ctx.fillRect(hx + 2, hy - 2, 1, 2)
  // Antennae — two thin lines above head
  ctx.fillStyle = '#76FF03'
  ctx.fillRect(hx - 2, hy - 9, 1, 4)
  ctx.fillRect(hx + 1, hy - 9, 1, 4)
  // Antenna tips — bright dots
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(hx - 2, hy - 9, 1, 1)
  ctx.fillRect(hx + 1, hy - 9, 1, 1)
}

// ─── Ball (unchanged) ─────────────────────────────────────────────────────────

export function drawBall(ctx: CanvasRenderingContext2D, ball: Ball, cam: Camera) {
  const gx = Math.round(ball.pos.x - cam.x)
  const gy = Math.round(ball.pos.y)
  const sx = gx
  const sy = Math.round(ball.pos.y - ball.z)

  const shadowAlpha = Math.max(0.05, 0.35 - ball.z * 0.008)
  ctx.fillStyle = `rgba(0,0,0,${shadowAlpha.toFixed(2)})`
  ctx.beginPath()
  ctx.ellipse(gx, gy + 2, 5, 2, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#f8f8f8'
  ctx.fillRect(sx - 4, sy - 4, 8, 8)
  ctx.fillStyle = '#101010'
  ctx.fillRect(sx - 4, sy - 4, 8, 1)
  ctx.fillRect(sx - 4, sy + 3, 8, 1)
  ctx.fillRect(sx - 4, sy - 4, 1, 8)
  ctx.fillRect(sx + 3, sy - 4, 1, 8)
  ctx.fillStyle = '#888888'
  ctx.fillRect(sx - 1, sy - 3, 2, 6)
  ctx.fillRect(sx - 3, sy - 1, 6, 2)
  ctx.fillStyle = '#101010'
  ctx.fillRect(sx - 1, sy - 1, 2, 2)
}
