import type { Player, Ball, CountryKit, PowerUp, Missile, Explosion } from '../types.js'
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

  // Team colour dot above every player — solid circle with black ring
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(sx, sy - 16, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = kit.home
  ctx.beginPath()
  ctx.arc(sx, sy - 16, 3, 0, Math.PI * 2)
  ctx.fill()

  // Active player yellow triangle above the team dot
  if (p.isActive) {
    ctx.fillStyle = '#ffff00'
    ctx.beginPath()
    ctx.moveTo(sx,     sy - 22)
    ctx.lineTo(sx - 4, sy - 28)
    ctx.lineTo(sx + 4, sy - 28)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  // Mushroom speed boost: flashing star ring
  if (p.speedBoost > 0) {
    const t = Date.now() / 200
    for (let i = 0; i < 4; i++) {
      const a = t + (i * Math.PI) / 2
      const starX = sx + Math.cos(a) * 10
      const starY = (sy - 8) + Math.sin(a) * 5
      ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#FF8C00'
      ctx.fillRect(Math.round(starX) - 1, Math.round(starY) - 1, 2, 2)
    }
  }

  // Missile: small rocket icon above player
  if (p.hasMissile) {
    // Body
    ctx.fillStyle = '#AAAAAA'
    ctx.fillRect(sx - 5, sy - 26, 9, 5)
    // Nose cone
    ctx.fillStyle = '#CC2200'
    ctx.fillRect(sx - 3, sy - 30, 5, 4)
    ctx.fillRect(sx - 1, sy - 32, 1, 2)
    // Fins
    ctx.fillStyle = '#888888'
    ctx.fillRect(sx - 7, sy - 23, 2, 3)
    ctx.fillRect(sx + 4, sy - 23, 2, 3)
    // Exhaust glow
    ctx.fillStyle = '#FF8C00'
    ctx.fillRect(sx - 2, sy - 21, 3, 2)
  }

  // Bomb: small bomb icon above player
  if (p.hasBomb) {
    ctx.fillStyle = '#222222'
    ctx.beginPath()
    ctx.arc(sx + 6, sy - 20, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#FF4400'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(sx + 8, sy - 26, 1, 4)
  }

  // Slimed: green drips all over the player
  if (p.slowTimer > 0) {
    const alpha = Math.min(1, p.slowTimer / 0.4)
    ctx.globalAlpha = alpha * 0.80
    // Green slime coat
    ctx.fillStyle = '#33CC33'
    ctx.beginPath()
    ctx.ellipse(sx, sy - 6, 8, 11, 0, 0, Math.PI * 2)
    ctx.fill()
    // Drips off shoulders and head
    ctx.fillStyle = '#22AA22'
    ctx.fillRect(sx - 7, sy - 4, 3, 5)
    ctx.fillRect(sx + 4,  sy - 6, 3, 7)
    ctx.fillRect(sx - 2, sy + 4,  3, 6)
    ctx.fillRect(sx + 1, sy + 3,  2, 8)
    // Highlight on the slime
    ctx.fillStyle = '#88FF88'
    ctx.fillRect(sx - 2, sy - 12, 2, 3)
    ctx.globalAlpha = 1
  }

  // Pie in face: cream splat overlay
  if (p.pieTimer > 0) {
    const alpha = Math.min(1, p.pieTimer / 0.4)
    ctx.globalAlpha = alpha * 0.85
    // Cream blob
    ctx.fillStyle = '#FFFAED'
    ctx.beginPath()
    ctx.arc(sx, sy - 8, 8, 0, Math.PI * 2)
    ctx.fill()
    // Splat drips
    ctx.fillRect(sx - 6, sy - 4, 3, 5)
    ctx.fillRect(sx + 4, sy - 3, 3, 6)
    ctx.fillRect(sx - 1, sy - 1, 3, 7)
    // Pie crust hint
    ctx.fillStyle = '#C8A46E'
    ctx.fillRect(sx - 7, sy - 11, 14, 3)
    ctx.globalAlpha = 1
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
    case 8: drawGhost(ctx, kit, hx, hy); break
    case 9: drawRobot(ctx, kit, hx, hy); break
    case 10: drawPirate(ctx, kit, hx, hy); break
    case 11: drawWizard(ctx, kit, hx, hy); break
    case 12: drawBarbie(ctx, kit, hx, hy); break
    case 13: drawLuffy(ctx, kit, hx, hy); break
    case 14: drawEleven(ctx, kit, hx, hy); break
    case 15: drawElsa(ctx, kit, hx, hy); break
    case 16: drawMoana(ctx, kit, hx, hy); break
    case 17: drawAriel(ctx, kit, hx, hy); break
    case 18: drawBelle(ctx, kit, hx, hy); break
    case 19: drawSpiderman(ctx, kit, hx, hy); break
    case 20: drawBatman(ctx, kit, hx, hy); break
    case 21: drawHelloKitty(ctx, kit, hx, hy); break
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

// ─── Skin 8: Ghost ───────────────────────────────────────────────────────────

function drawGhost(ctx: CanvasRenderingContext2D, kit: CountryKit, hx: number, hy: number) {
  // Translucent white sheet body
  ctx.fillStyle = '#E8E8F8'
  ctx.fillRect(-5, -9, 10, 16)
  ctx.fillRect(-4, -10, 8, 2)  // rounded top
  // Wavy bottom — three bumps
  ctx.fillStyle = '#C8C8E0'
  ctx.fillRect(-5, 7, 3, 2)
  ctx.fillRect(-1, 6, 3, 3)
  ctx.fillRect(3, 7, 2, 2)
  // Kit accent stripe
  ctx.fillStyle = kit.home
  ctx.fillRect(-3, -3, 6, 2)
  // Hollow black eyes
  ctx.fillStyle = '#1A1A3E'
  ctx.fillRect(hx - 3, hy - 1, 3, 3)
  ctx.fillRect(hx + 1, hy - 1, 3, 3)
  // White pupils
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(hx - 2, hy, 1, 1)
  ctx.fillRect(hx + 2, hy, 1, 1)
}

// ─── Skin 9: Robot ───────────────────────────────────────────────────────────

function drawRobot(ctx: CanvasRenderingContext2D, kit: CountryKit, hx: number, hy: number) {
  // Metal body
  ctx.fillStyle = '#B0BEC5'
  ctx.fillRect(-5, -7, 10, 14)
  // Kit chest panel
  ctx.fillStyle = kit.home
  ctx.fillRect(-3, -5, 6, 4)
  // Rivets
  ctx.fillStyle = '#78909C'
  ctx.fillRect(-4, -6, 2, 2)
  ctx.fillRect(2, -6, 2, 2)
  // Legs — dark panels
  ctx.fillStyle = '#546E7A'
  ctx.fillRect(-5, 5, 4, 4)
  ctx.fillRect(1, 5, 4, 4)
  // Square head — silver
  ctx.fillStyle = '#CFD8DC'
  ctx.fillRect(hx - 4, hy - 4, 8, 8)
  // Visor — red LED
  ctx.fillStyle = '#FF1744'
  ctx.fillRect(hx - 3, hy - 1, 6, 2)
  // Antenna
  ctx.fillStyle = '#90A4AE'
  ctx.fillRect(hx, hy - 8, 1, 4)
  ctx.fillStyle = '#FF1744'
  ctx.fillRect(hx - 1, hy - 9, 3, 2)
}

// ─── Skin 10: Pirate ──────────────────────────────────────────────────────────

function drawPirate(ctx: CanvasRenderingContext2D, kit: CountryKit, hx: number, hy: number) {
  // Striped shirt — alternating kit and white
  ctx.fillStyle = kit.home
  ctx.fillRect(-5, -7, 10, 14)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillRect(-5, -5, 10, 2)
  ctx.fillRect(-5, -1, 10, 2)
  ctx.fillRect(-5, 3, 10, 2)
  // Dark trousers
  ctx.fillStyle = '#1A0A00'
  ctx.fillRect(-5, 4, 10, 6)
  // Brown boots
  ctx.fillStyle = '#5C3A1E'
  ctx.fillRect(-5, 8, 5, 2)
  ctx.fillRect(0, 8, 5, 2)
  // Tan face
  ctx.fillStyle = '#FDBCB4'
  ctx.fillRect(hx - 3, hy - 1, 7, 5)
  // Black pirate hat
  ctx.fillStyle = '#1A1A1A'
  ctx.fillRect(hx - 4, hy - 6, 9, 5)
  ctx.fillRect(hx - 5, hy - 2, 11, 1)  // hat brim
  // Skull & crossbones — white dot on hat
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(hx - 1, hy - 5, 3, 3)
  // Eyepatch
  ctx.fillStyle = '#1A1A1A'
  ctx.fillRect(hx - 2, hy + 1, 3, 2)
  // Other eye
  ctx.fillStyle = '#1A0A00'
  ctx.fillRect(hx + 2, hy + 1, 2, 2)
}

// ─── Skin 11: Wizard ──────────────────────────────────────────────────────────

function drawWizard(ctx: CanvasRenderingContext2D, kit: CountryKit, hx: number, hy: number) {
  // Robe — deep purple
  ctx.fillStyle = '#4A148C'
  ctx.fillRect(-5, -7, 10, 16)
  // Kit colour star on chest
  ctx.fillStyle = kit.home
  ctx.fillRect(-1, -4, 3, 1)
  ctx.fillRect(-2, -3, 5, 1)
  ctx.fillRect(-1, -2, 3, 1)
  // Golden belt
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(-5, 1, 10, 2)
  // Tan face
  ctx.fillStyle = '#FDBCB4'
  ctx.fillRect(hx - 3, hy - 1, 6, 5)
  // Tall pointed hat — kit colour
  ctx.fillStyle = kit.home
  ctx.fillRect(hx - 1, hy - 10, 3, 6)   // point
  ctx.fillRect(hx - 3, hy - 5, 7, 4)    // hat body
  ctx.fillRect(hx - 4, hy - 2, 9, 1)    // hat brim
  // Stars on hat
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(hx - 2, hy - 8, 1, 1)
  ctx.fillRect(hx + 1, hy - 6, 1, 1)
  // Eyes
  ctx.fillStyle = '#1A0A00'
  ctx.fillRect(hx - 2, hy + 1, 2, 2)
  ctx.fillRect(hx + 1, hy + 1, 2, 2)
  // White beard
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(hx - 2, hy + 3, 5, 2)
}

// ─── Skin 12: Barbie ─────────────────────────────────────────────────────────

function drawBarbie(ctx: CanvasRenderingContext2D, _kit: CountryKit, hx: number, hy: number) {
  // Hot pink dress — wide flared skirt
  ctx.fillStyle = '#FF1493'
  ctx.fillRect(-6, -6, 12, 15)
  ctx.fillRect(-7, 2, 14, 6)   // flared skirt
  // White bodice trim
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(-4, -6, 8, 3)
  // Sparkle detail
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(-2, -5, 1, 1)
  ctx.fillRect(1, -4, 1, 1)
  // Pink heels
  ctx.fillStyle = '#FF69B4'
  ctx.fillRect(-5, 9, 4, 2)
  ctx.fillRect(1, 9, 4, 2)
  // Skin-tone face
  ctx.fillStyle = '#FDBCB4'
  ctx.fillRect(hx - 3, hy - 1, 6, 5)
  // Blonde high ponytail
  ctx.fillStyle = '#FFE135'
  ctx.fillRect(hx - 4, hy - 6, 8, 5)   // hair volume
  ctx.fillRect(hx + 2, hy - 9, 3, 8)   // ponytail up
  // Blue eyes — iconic
  ctx.fillStyle = '#1E90FF'
  ctx.fillRect(hx - 2, hy + 1, 2, 2)
  ctx.fillRect(hx + 1, hy + 1, 2, 2)
  // Smile
  ctx.fillStyle = '#C41E3A'
  ctx.fillRect(hx - 1, hy + 3, 3, 1)
}

// ─── Skin 13: Luffy (One Piece) ───────────────────────────────────────────────

function drawLuffy(ctx: CanvasRenderingContext2D, _kit: CountryKit, hx: number, hy: number) {
  // Red vest (open, no sleeves)
  ctx.fillStyle = '#C41E1E'
  ctx.fillRect(-5, -7, 10, 9)
  // Open chest gap — tan skin
  ctx.fillStyle = '#FDBCB4'
  ctx.fillRect(-1, -6, 3, 7)
  // Blue shorts
  ctx.fillStyle = '#1565C0'
  ctx.fillRect(-5, 2, 10, 6)
  // Brown sandal straps
  ctx.fillStyle = '#5C3A1E'
  ctx.fillRect(-5, 8, 4, 2)
  ctx.fillRect(1, 8, 4, 2)
  // Tan face
  ctx.fillStyle = '#FDBCB4'
  ctx.fillRect(hx - 3, hy - 1, 7, 5)
  // Scar under left eye — two horizontal lines
  ctx.fillStyle = '#C41E1E'
  ctx.fillRect(hx - 2, hy + 2, 2, 1)
  // Iconic straw hat — wide brim, yellow
  ctx.fillStyle = '#D4A017'
  ctx.fillRect(hx - 6, hy - 2, 13, 1)  // brim
  ctx.fillRect(hx - 4, hy - 6, 9, 4)   // hat body
  // Red hat band
  ctx.fillStyle = '#C41E1E'
  ctx.fillRect(hx - 4, hy - 3, 9, 1)
  // Black hair — spiky tufts below hat
  ctx.fillStyle = '#101010'
  ctx.fillRect(hx - 3, hy - 1, 2, 2)
  ctx.fillRect(hx + 1, hy - 1, 2, 2)
  // Eyes
  ctx.fillRect(hx - 2, hy + 1, 2, 2)
  ctx.fillRect(hx + 1, hy + 1, 2, 2)
}

// ─── Skin 14: Eleven (Stranger Things) ───────────────────────────────────────

function drawEleven(ctx: CanvasRenderingContext2D, _kit: CountryKit, hx: number, hy: number) {
  // Blue Hawkins Middle School shirt / jacket
  ctx.fillStyle = '#1A237E'
  ctx.fillRect(-5, -7, 10, 9)
  // Yellow stripe on jacket
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(-5, -3, 10, 2)
  // Pink dress visible below jacket
  ctx.fillStyle = '#F48FB1'
  ctx.fillRect(-5, 2, 10, 6)
  // White socks
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(-5, 8, 4, 2)
  ctx.fillRect(1, 8, 4, 2)
  // Pale face
  ctx.fillStyle = '#F5D5C8'
  ctx.fillRect(hx - 3, hy - 1, 7, 5)
  // Short buzzcut — very dark brown
  ctx.fillStyle = '#3E2723'
  ctx.fillRect(hx - 4, hy - 4, 8, 3)
  // Dark brown eyes
  ctx.fillStyle = '#3E2723'
  ctx.fillRect(hx - 2, hy + 1, 2, 2)
  ctx.fillRect(hx + 1, hy + 1, 2, 2)
  // Iconic nosebleed — red pixel
  ctx.fillStyle = '#C41E1E'
  ctx.fillRect(hx, hy + 3, 1, 2)
}

// ─── Skin 15: Elsa (Frozen) ──────────────────────────────────────────────────

function drawElsa(ctx: CanvasRenderingContext2D, _kit: CountryKit, hx: number, hy: number) {
  // Ice-blue dress with cape
  ctx.fillStyle = '#A8D8EA'
  ctx.fillRect(-5, -7, 10, 15)
  ctx.fillRect(-6, 0, 12, 8)   // flared skirt
  // Cape — semi-transparent sparkle effect (darker blue)
  ctx.fillStyle = '#78B4CC'
  ctx.fillRect(-6, -7, 3, 12)
  ctx.fillRect(3, -7, 3, 12)
  // Snowflake detail on bodice
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(-1, -5, 3, 1)
  ctx.fillRect(0, -6, 1, 3)
  // Silver crown
  ctx.fillStyle = '#C8E6FF'
  ctx.fillRect(hx - 3, hy - 7, 7, 2)
  ctx.fillRect(hx - 2, hy - 9, 2, 2)
  ctx.fillRect(hx + 1, hy - 9, 2, 2)
  // Pale face
  ctx.fillStyle = '#F5E8DC'
  ctx.fillRect(hx - 3, hy - 1, 6, 5)
  // Platinum blonde side braid
  ctx.fillStyle = '#F0E8C0'
  ctx.fillRect(hx - 4, hy - 4, 8, 3)
  ctx.fillRect(hx + 3, hy - 2, 2, 8)   // braid down side
  // Blue eyes
  ctx.fillStyle = '#4A90D9'
  ctx.fillRect(hx - 2, hy + 1, 2, 2)
  ctx.fillRect(hx + 1, hy + 1, 2, 2)
}

// ─── Skin 16: Moana ──────────────────────────────────────────────────────────

function drawMoana(ctx: CanvasRenderingContext2D, _kit: CountryKit, hx: number, hy: number) {
  // Red-coral bodice top
  ctx.fillStyle = '#C0392B'
  ctx.fillRect(-5, -7, 10, 6)
  // Tapa pattern on bodice
  ctx.fillStyle = '#8B2500'
  ctx.fillRect(-4, -6, 2, 2)
  ctx.fillRect(2, -4, 2, 2)
  // White/tan skirt with leaf detail
  ctx.fillStyle = '#D4A843'
  ctx.fillRect(-5, -1, 10, 10)
  ctx.fillRect(-6, 2, 12, 6)   // wide skirt
  // Green leaf overlay
  ctx.fillStyle = '#4A7C24'
  ctx.fillRect(-4, 2, 3, 4)
  ctx.fillRect(1, 3, 3, 4)
  // Brown skin
  ctx.fillStyle = '#8B5E3C'
  ctx.fillRect(hx - 3, hy - 1, 7, 5)
  // Long black hair
  ctx.fillStyle = '#101010'
  ctx.fillRect(hx - 4, hy - 5, 9, 4)  // hair top
  ctx.fillRect(hx - 5, hy - 1, 3, 8)  // left hair fall
  ctx.fillRect(hx + 3, hy - 1, 3, 7)  // right hair fall
  // White flower in hair
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(hx - 4, hy - 3, 3, 3)
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(hx - 3, hy - 2, 1, 1)
  // Dark brown eyes
  ctx.fillStyle = '#3E1F00'
  ctx.fillRect(hx - 2, hy + 1, 2, 2)
  ctx.fillRect(hx + 1, hy + 1, 2, 2)
}

// ─── Skin 17: Ariel (The Little Mermaid) ─────────────────────────────────────

function drawAriel(ctx: CanvasRenderingContext2D, _kit: CountryKit, hx: number, hy: number) {
  // Sea-green "tail" dress
  ctx.fillStyle = '#1B8A5A'
  ctx.fillRect(-5, -2, 10, 12)
  ctx.fillRect(-4, 8, 8, 4)   // flared fin bottom
  // Scale shimmer
  ctx.fillStyle = '#22AA6A'
  ctx.fillRect(-4, 0, 3, 4)
  ctx.fillRect(1, 2, 3, 4)
  // Purple seashell top
  ctx.fillStyle = '#9B59B6'
  ctx.fillRect(-5, -7, 10, 5)
  // Shell detail lines
  ctx.fillStyle = '#7D3C98'
  ctx.fillRect(-3, -7, 2, 4)
  ctx.fillRect(0, -6, 2, 3)
  // Pale skin face
  ctx.fillStyle = '#FDBCB4'
  ctx.fillRect(hx - 3, hy - 1, 7, 5)
  // Iconic red hair — long flowing
  ctx.fillStyle = '#C0392B'
  ctx.fillRect(hx - 5, hy - 5, 10, 4)  // hair volume
  ctx.fillRect(hx - 5, hy - 1, 3, 9)   // left flow
  ctx.fillRect(hx + 3, hy, 3, 7)        // right flow
  // Green eyes
  ctx.fillStyle = '#27AE60'
  ctx.fillRect(hx - 2, hy + 1, 2, 2)
  ctx.fillRect(hx + 1, hy + 1, 2, 2)
}

// ─── Skin 18: Belle (Beauty and the Beast) ───────────────────────────────────

function drawBelle(ctx: CanvasRenderingContext2D, _kit: CountryKit, hx: number, hy: number) {
  // Gold ballgown — very full
  ctx.fillStyle = '#F4C430'
  ctx.fillRect(-5, -6, 10, 15)
  ctx.fillRect(-7, 2, 14, 7)   // wide bell skirt
  // White gloves / apron trim
  ctx.fillStyle = '#FFFFF0'
  ctx.fillRect(-4, -6, 8, 3)
  // Golden bodice sparkle
  ctx.fillStyle = '#D4A900'
  ctx.fillRect(-3, -5, 2, 3)
  ctx.fillRect(1, -4, 2, 3)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(-1, -6, 3, 1)
  // Pale face
  ctx.fillStyle = '#FDBCB4'
  ctx.fillRect(hx - 3, hy - 1, 6, 5)
  // Dark brown hair in updo bun
  ctx.fillStyle = '#6B3A1F'
  ctx.fillRect(hx - 3, hy - 5, 7, 4)   // main hair
  ctx.fillRect(hx - 1, hy - 8, 4, 3)   // bun top
  // Gold ribbon in hair
  ctx.fillStyle = '#F4C430'
  ctx.fillRect(hx - 3, hy - 3, 7, 1)
  // Hazel eyes
  ctx.fillStyle = '#8B6914'
  ctx.fillRect(hx - 2, hy + 1, 2, 2)
  ctx.fillRect(hx + 1, hy + 1, 2, 2)
  // Smile
  ctx.fillStyle = '#C41E3A'
  ctx.fillRect(hx - 1, hy + 3, 3, 1)
}

// ─── Skin 19: Spiderman ───────────────────────────────────────────────────────

function drawSpiderman(ctx: CanvasRenderingContext2D, _kit: CountryKit, hx: number, hy: number) {
  // Blue legs
  ctx.fillStyle = '#1A1A9E'
  ctx.fillRect(-5, 0, 10, 10)
  // Red torso
  ctx.fillStyle = '#CC1111'
  ctx.fillRect(-5, -8, 10, 9)
  // Blue arms
  ctx.fillStyle = '#1A1A9E'
  ctx.fillRect(-8, -7, 3, 7)
  ctx.fillRect(5, -7, 3, 7)
  // Web lines on torso (dark red grid)
  ctx.fillStyle = '#880000'
  ctx.fillRect(-4, -6, 8, 1)
  ctx.fillRect(-4, -3, 8, 1)
  ctx.fillRect(-4, 0, 8, 1)
  ctx.fillRect(-2, -8, 1, 9)
  ctx.fillRect(1, -8, 1, 9)
  // Spider symbol on chest
  ctx.fillStyle = '#101010'
  ctx.fillRect(-2, -5, 4, 1)
  ctx.fillRect(-1, -4, 2, 2)
  ctx.fillRect(-3, -3, 1, 2)
  ctx.fillRect(2, -3, 1, 2)
  // Red boots
  ctx.fillStyle = '#CC1111'
  ctx.fillRect(-5, 8, 4, 3)
  ctx.fillRect(1, 8, 4, 3)
  // Red head mask
  ctx.fillStyle = '#CC1111'
  ctx.fillRect(hx - 4, hy - 5, 8, 9)
  // Web pattern on mask
  ctx.fillStyle = '#880000'
  ctx.fillRect(hx - 3, hy - 3, 6, 1)
  ctx.fillRect(hx - 3, hy, 6, 1)
  ctx.fillRect(hx - 1, hy - 5, 1, 7)
  ctx.fillRect(hx + 1, hy - 5, 1, 7)
  // Big white eye lenses (the most iconic feature)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(hx - 3, hy - 2, 2, 3)
  ctx.fillRect(hx + 1, hy - 2, 2, 3)
  // Eye outline
  ctx.fillStyle = '#101010'
  ctx.fillRect(hx - 4, hy - 3, 1, 4)
  ctx.fillRect(hx - 2, hy - 3, 1, 1)
  ctx.fillRect(hx - 2, hy + 1, 1, 1)
  ctx.fillRect(hx + 3, hy - 3, 1, 4)
  ctx.fillRect(hx + 1, hy - 3, 1, 1)
  ctx.fillRect(hx + 1, hy + 1, 1, 1)
}

// ─── Skin 20: Batman ─────────────────────────────────────────────────────────

function drawBatman(ctx: CanvasRenderingContext2D, _kit: CountryKit, hx: number, hy: number) {
  // Dark gray body / batsuit
  ctx.fillStyle = '#2A2A2A'
  ctx.fillRect(-6, -8, 12, 10)
  // Cape suggestion (darker, wider at top)
  ctx.fillStyle = '#1A1A1A'
  ctx.fillRect(-8, -8, 3, 9)
  ctx.fillRect(5, -8, 3, 9)
  // Black legs
  ctx.fillStyle = '#1A1A1A'
  ctx.fillRect(-5, 2, 10, 9)
  // Yellow utility belt
  ctx.fillStyle = '#F4C430'
  ctx.fillRect(-5, 1, 10, 2)
  // Belt pouches
  ctx.fillStyle = '#D4A900'
  ctx.fillRect(-4, 1, 2, 2)
  ctx.fillRect(-1, 1, 2, 2)
  ctx.fillRect(2, 1, 2, 2)
  // Bat symbol on chest (yellow)
  ctx.fillStyle = '#F4C430'
  ctx.fillRect(-4, -5, 8, 2)   // wings
  ctx.fillRect(-3, -6, 6, 1)
  ctx.fillRect(-2, -7, 4, 1)
  ctx.fillRect(-1, -4, 2, 3)   // body of bat
  ctx.fillStyle = '#2A2A2A'    // cutout notches
  ctx.fillRect(-4, -5, 1, 1)
  ctx.fillRect(3, -5, 1, 1)
  ctx.fillRect(-1, -4, 1, 1)
  ctx.fillRect(0, -4, 1, 1)  // just one pixel, bat detail
  // Black boots
  ctx.fillStyle = '#101010'
  ctx.fillRect(-5, 9, 4, 2)
  ctx.fillRect(1, 9, 4, 2)
  // Cowl — dark gray, covers whole head
  ctx.fillStyle = '#2A2A2A'
  ctx.fillRect(hx - 4, hy - 5, 8, 9)
  // Bat ears on top! (the most distinctive feature)
  ctx.fillStyle = '#1A1A1A'
  ctx.fillRect(hx - 4, hy - 9, 2, 4)  // left ear
  ctx.fillRect(hx + 2, hy - 9, 2, 4)  // right ear
  // White eye slits in cowl
  ctx.fillStyle = '#DDDDDD'
  ctx.fillRect(hx - 3, hy - 1, 2, 2)
  ctx.fillRect(hx + 1, hy - 1, 2, 2)
  // Chin / jaw — slightly lighter
  ctx.fillStyle = '#FDBCB4'
  ctx.fillRect(hx - 2, hy + 3, 4, 2)
  // Determined grimace
  ctx.fillStyle = '#101010'
  ctx.fillRect(hx - 1, hy + 4, 3, 1)
}

// ─── Skin 21: Hello Kitty ────────────────────────────────────────────────────

function drawHelloKitty(ctx: CanvasRenderingContext2D, _kit: CountryKit, hx: number, hy: number) {
  // White dress / overalls
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(-5, -7, 10, 17)
  // Pink trim / collar
  ctx.fillStyle = '#FF99BB'
  ctx.fillRect(-5, -7, 10, 2)
  // Red bow on collar
  ctx.fillStyle = '#DD0000'
  ctx.fillRect(-2, -8, 5, 2)
  ctx.fillStyle = '#FF3333'
  ctx.fillRect(-1, -8, 1, 2)
  ctx.fillRect(1, -8, 1, 2)
  // Blue stripe on dress
  ctx.fillStyle = '#4488FF'
  ctx.fillRect(-4, 0, 8, 2)
  // White shoes
  ctx.fillStyle = '#EEEEEE'
  ctx.fillRect(-4, 9, 3, 2)
  ctx.fillRect(1, 9, 3, 2)
  // White round head (wide, Hello Kitty style)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(hx - 5, hy - 5, 10, 9)
  // Cat ears (round nubs at top)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(hx - 5, hy - 8, 3, 3)  // left ear
  ctx.fillRect(hx + 2, hy - 8, 3, 3)  // right ear
  // Pink inner ears
  ctx.fillStyle = '#FF99BB'
  ctx.fillRect(hx - 4, hy - 7, 1, 2)
  ctx.fillRect(hx + 3, hy - 7, 1, 2)
  // Iconic pink bow on LEFT ear (top of head)
  ctx.fillStyle = '#FF0066'
  ctx.fillRect(hx - 1, hy - 9, 4, 2)   // bow wings
  ctx.fillStyle = '#CC0044'
  ctx.fillRect(hx + 1, hy - 9, 1, 2)   // bow knot center
  // Tiny black dot eyes (no mouth on Hello Kitty!)
  ctx.fillStyle = '#101010'
  ctx.fillRect(hx - 3, hy, 2, 2)
  ctx.fillRect(hx + 1, hy, 2, 2)
  // Yellow nose dot
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(hx - 1, hy + 2, 2, 1)
  // Whiskers
  ctx.fillStyle = '#AAAAAA'
  ctx.fillRect(hx - 5, hy + 1, 2, 1)   // left whiskers
  ctx.fillRect(hx - 5, hy + 3, 2, 1)
  ctx.fillRect(hx + 3, hy + 1, 2, 1)   // right whiskers
  ctx.fillRect(hx + 3, hy + 3, 2, 1)
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

// ─── Power-ups ────────────────────────────────────────────────────────────────

export function drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUp, cam: Camera) {
  const sx = Math.round(pu.pos.x - cam.x)
  const bob = Math.sin(pu.spawnTimer * 3) * 2
  const sy = Math.round(pu.pos.y - 8 + bob)

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(sx, Math.round(pu.pos.y) + 2, 7, 2, 0, 0, Math.PI * 2)
  ctx.fill()

  if (pu.type === 'slime') {
    // Wobbly slime blob — squash/stretch using spawnTimer
    const wobble = Math.sin(pu.spawnTimer * 4) * 2
    const blobW = 13 + wobble
    const blobH = 11 - wobble
    // Main blob (bright Nee-Doh green)
    ctx.fillStyle = '#44DD44'
    ctx.beginPath()
    ctx.ellipse(sx, sy, blobW / 2, blobH / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    // Highlight (lighter green)
    ctx.fillStyle = '#88FF88'
    ctx.beginPath()
    ctx.ellipse(sx - 2, sy - 2, blobW / 4, blobH / 4, 0, 0, Math.PI * 2)
    ctx.fill()
    // Drips hanging off the bottom
    ctx.fillStyle = '#33CC33'
    ctx.fillRect(sx - 4, sy + Math.round(blobH / 2) - 1, 3, 4)
    ctx.fillRect(sx + 1, sy + Math.round(blobH / 2) - 1, 3, 6)
    ctx.fillRect(sx - 1, sy + Math.round(blobH / 2) - 1, 2, 3)
    // Dark blob center / eye dots
    ctx.fillStyle = '#006600'
    ctx.fillRect(sx - 3, sy - 1, 2, 2)
    ctx.fillRect(sx + 1, sy - 1, 2, 2)
    // Angry eyebrow lines (it's a trap!)
    ctx.fillStyle = '#004400'
    ctx.fillRect(sx - 4, sy - 3, 3, 1)
    ctx.fillRect(sx + 1, sy - 3, 3, 1)
    // Green glow ring
    ctx.strokeStyle = 'rgba(50,220,50,0.75)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(sx, sy, 11, 0, Math.PI * 2)
    ctx.stroke()
  } else if (pu.type === 'turbo') {
    // NES nitro bottle — silver cap
    ctx.fillStyle = '#999999'
    ctx.fillRect(sx - 2, sy - 10, 5, 3)
    ctx.fillStyle = '#CCCCCC'
    ctx.fillRect(sx - 1, sy - 10, 3, 1)
    // Bottle body (electric blue)
    ctx.fillStyle = '#0055BB'
    ctx.fillRect(sx - 4, sy - 7, 9, 13)
    // Left highlight stripe (lighter blue)
    ctx.fillStyle = '#3388EE'
    ctx.fillRect(sx - 3, sy - 6, 2, 11)
    // Right shadow
    ctx.fillStyle = '#003D8A'
    ctx.fillRect(sx + 3, sy - 6, 2, 11)
    // Lightning bolt label (yellow pixel art)
    ctx.fillStyle = '#FFE000'
    ctx.fillRect(sx + 1, sy - 4, 2, 3)   // upper arm →
    ctx.fillRect(sx - 1, sy - 1, 3, 2)   // middle bar
    ctx.fillRect(sx - 2, sy + 1, 2, 3)   // lower arm →
    // Bolt shine
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(sx + 1, sy - 4, 1, 1)
    // Bottom cap
    ctx.fillStyle = '#888888'
    ctx.fillRect(sx - 2, sy + 6, 5, 2)
    // Electric glow ring
    ctx.strokeStyle = 'rgba(80,180,255,0.85)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(sx, sy - 1, 11, 0, Math.PI * 2)
    ctx.stroke()
    // Speed sparks
    const t = Date.now() / 120
    ctx.fillStyle = 'rgba(150,220,255,0.9)'
    for (let i = 0; i < 4; i++) {
      const a = t + (i * Math.PI) / 2
      const rx = sx + Math.cos(a) * 13
      const ry = (sy - 1) + Math.sin(a) * 8
      ctx.fillRect(Math.round(rx), Math.round(ry), 2, 2)
    }
  } else if (pu.type === 'missile') {
    // Rocket body
    ctx.fillStyle = '#B0B0B0'
    ctx.fillRect(sx - 4, sy - 2, 10, 6)
    // Nose cone (red)
    ctx.fillStyle = '#DD2200'
    ctx.fillRect(sx - 2, sy - 6, 6, 4)
    ctx.fillRect(sx, sy - 8, 2, 2)
    // Fins (dark gray)
    ctx.fillStyle = '#666666'
    ctx.fillRect(sx - 6, sy + 2, 2, 4)
    ctx.fillRect(sx + 8, sy + 2, 2, 4)
    // Exhaust flame
    ctx.fillStyle = '#FF8C00'
    ctx.fillRect(sx + 6, sy + 1, 3, 3)
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(sx + 7, sy + 1, 2, 2)
    // Glow ring (orange)
    ctx.strokeStyle = 'rgba(255,140,0,0.7)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(sx + 1, sy + 1, 11, 0, Math.PI * 2)
    ctx.stroke()
  } else if (pu.type === 'mushroom') {
    // Cap (red with white spots)
    ctx.fillStyle = '#E03030'
    ctx.beginPath()
    ctx.arc(sx, sy, 7, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(sx - 2, sy - 5, 2, 2)
    ctx.fillRect(sx + 2, sy - 4, 2, 2)
    // Stem (cream)
    ctx.fillStyle = '#FAEBD7'
    ctx.fillRect(sx - 4, sy, 8, 5)
    // Eyes
    ctx.fillStyle = '#101010'
    ctx.fillRect(sx - 2, sy + 1, 1, 2)
    ctx.fillRect(sx + 1, sy + 1, 1, 2)
    // Bright glow ring
    ctx.strokeStyle = 'rgba(255,220,0,0.7)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(sx, sy - 1, 9, 0, Math.PI * 2)
    ctx.stroke()
  } else if (pu.type === 'bomb') {
    // Bomb: black circle with fuse
    ctx.fillStyle = '#222222'
    ctx.beginPath()
    ctx.arc(sx, sy + 2, 6, 0, Math.PI * 2)
    ctx.fill()
    // Shine spot
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.arc(sx - 2, sy, 2, 0, Math.PI * 2)
    ctx.fill()
    // Fuse
    ctx.strokeStyle = '#8B6914'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(sx + 4, sy - 3)
    ctx.quadraticCurveTo(sx + 8, sy - 8, sx + 6, sy - 12)
    ctx.stroke()
    // Fuse spark
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(sx + 5, sy - 13, 2, 2)
    ctx.fillStyle = '#FF6600'
    ctx.fillRect(sx + 6, sy - 12, 2, 2)
    // Danger ring
    ctx.strokeStyle = 'rgba(255,60,0,0.7)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(sx, sy + 2, 9, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    // Pie — crust base
    ctx.fillStyle = '#C8A46E'
    ctx.beginPath()
    ctx.ellipse(sx, sy + 4, 9, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(sx - 9, sy - 2, 18, 5)
    // Pie side crust
    ctx.fillStyle = '#B8904E'
    ctx.fillRect(sx - 9, sy + 1, 18, 2)
    // Cream filling (white dome)
    ctx.fillStyle = '#FFFAED'
    ctx.beginPath()
    ctx.arc(sx, sy - 3, 7, Math.PI, 0)
    ctx.fill()
    // Cream peaks
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(sx - 3, sy - 6, 2.5, Math.PI, 0)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(sx + 3, sy - 5, 2, Math.PI, 0)
    ctx.fill()
    // Warning glow (purple, since it's a trap)
    ctx.strokeStyle = 'rgba(180,0,255,0.65)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(sx, sy, 11, 0, Math.PI * 2)
    ctx.stroke()
  }
}

// ─── Missile in flight ────────────────────────────────────────────────────────

export function drawMissile(ctx: CanvasRenderingContext2D, m: Missile, cam: Camera) {
  const sx = Math.round(m.pos.x - cam.x)
  const sy = Math.round(m.pos.y)
  const angle = Math.atan2(m.vel.y, m.vel.x)

  ctx.save()
  ctx.translate(sx, sy)
  ctx.rotate(angle)

  // Body
  ctx.fillStyle = '#C0C0C0'
  ctx.fillRect(-8, -3, 14, 6)
  // Nose
  ctx.fillStyle = '#DD2200'
  ctx.fillRect(6, -2, 4, 4)
  ctx.fillRect(9, -1, 2, 2)
  // Fins
  ctx.fillStyle = '#777777'
  ctx.fillRect(-8, -5, 3, 2)
  ctx.fillRect(-8, 3, 3, 2)
  // Exhaust flame (behind rocket)
  ctx.fillStyle = '#FF8C00'
  ctx.fillRect(-12, -2, 5, 4)
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(-11, -1, 3, 2)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(-10, 0, 1, 1)

  ctx.restore()
}

// ─── Explosion ────────────────────────────────────────────────────────────────

export function drawExplosion(ctx: CanvasRenderingContext2D, ex: Explosion, cam: Camera) {
  const sx = Math.round(ex.pos.x - cam.x)
  const sy = Math.round(ex.pos.y)
  const progress = 1 - ex.timer / ex.maxTimer  // 0 → 1
  const maxR = 44
  const r = progress * maxR
  const alpha = ex.timer / ex.maxTimer  // fades out

  // Outer shockwave ring
  ctx.globalAlpha = alpha * 0.85
  ctx.strokeStyle = '#FF4400'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(sx, sy, r, 0, Math.PI * 2)
  ctx.stroke()

  // Inner bright ring
  if (r > 6) {
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(sx, sy, r * 0.6, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Flash fill on initial frame
  if (progress < 0.2) {
    ctx.fillStyle = `rgba(255,200,50,${alpha * (1 - progress / 0.2) * 0.5})`
    ctx.beginPath()
    ctx.arc(sx, sy, r * 1.1, 0, Math.PI * 2)
    ctx.fill()
  }

  // Debris pixels radiating outward
  ctx.fillStyle = `rgba(255,100,0,${alpha * 0.9})`
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + progress
    const pr = r * 0.85
    const px = Math.round(sx + Math.cos(a) * pr)
    const py = Math.round(sy + Math.sin(a) * pr * 0.7)
    ctx.fillRect(px - 1, py - 1, 3, 3)
  }

  ctx.globalAlpha = 1
}

// ─── Demogorgon ───────────────────────────────────────────────────────────────

export function drawDemogorgon(
  ctx: CanvasRenderingContext2D,
  pos: { x: number; y: number },
  lifetime: number,
  cam: Camera,
) {
  const sx = Math.round(pos.x - cam.x)
  const sy = Math.round(pos.y)

  // Flash when about to despawn (last 2s)
  if (lifetime < 2 && Math.floor(lifetime * 6) % 2 === 0) return

  // Dark aura underneath
  ctx.globalAlpha = 0.35
  ctx.fillStyle = '#1A0020'
  ctx.beginPath()
  ctx.ellipse(sx, sy + 4, 14, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // ── Legs ──
  ctx.fillStyle = '#2C1A10'
  ctx.fillRect(sx - 5, sy - 2, 3, 7)   // left leg
  ctx.fillRect(sx + 2, sy - 2, 3, 7)   // right leg
  // Feet (slightly lighter)
  ctx.fillStyle = '#3A2218'
  ctx.fillRect(sx - 7, sy + 4, 4, 3)
  ctx.fillRect(sx + 3, sy + 4, 4, 3)

  // ── Body / torso ──
  ctx.fillStyle = '#2C1A10'
  ctx.fillRect(sx - 6, sy - 14, 12, 13)

  // Body texture ridges
  ctx.fillStyle = '#1E1008'
  ctx.fillRect(sx - 4, sy - 12, 2, 8)
  ctx.fillRect(sx + 1, sy - 12, 2, 8)

  // ── Arms ── (outstretched for menace)
  ctx.fillStyle = '#2C1A10'
  ctx.fillRect(sx - 14, sy - 12, 8, 3)  // left arm
  ctx.fillRect(sx + 6,  sy - 12, 8, 3)  // right arm
  // Claws
  ctx.fillStyle = '#1A0A04'
  ctx.fillRect(sx - 16, sy - 14, 3, 2)
  ctx.fillRect(sx - 16, sy - 12, 3, 2)
  ctx.fillRect(sx - 16, sy - 10, 3, 2)
  ctx.fillRect(sx + 13, sy - 14, 3, 2)
  ctx.fillRect(sx + 13, sy - 12, 3, 2)
  ctx.fillRect(sx + 13, sy - 10, 3, 2)

  // ── Flower face (the iconic petal spread) ──
  // Petal pulse — opens and closes
  const petalOpen = 0.6 + Math.sin(Date.now() / 180) * 0.4
  const petalDist = Math.round(5 * petalOpen)
  const petalColor = '#8B1A2A'
  const petalHighlight = '#C4355A'

  // 5 petals radially arranged
  const petalAngles = [
    -Math.PI / 2,           // top
    -Math.PI / 2 + (2 * Math.PI / 5),
    -Math.PI / 2 + (4 * Math.PI / 5),
    -Math.PI / 2 + (6 * Math.PI / 5),
    -Math.PI / 2 + (8 * Math.PI / 5),
  ]
  const headY = sy - 22
  for (const angle of petalAngles) {
    const px = Math.round(sx + Math.cos(angle) * petalDist)
    const py = Math.round(headY + Math.sin(angle) * petalDist)
    ctx.fillStyle = petalColor
    ctx.fillRect(px - 2, py - 2, 4, 4)
    ctx.fillStyle = petalHighlight
    ctx.fillRect(px - 1, py - 1, 2, 2)
  }

  // Skull/head center (dark void)
  ctx.fillStyle = '#0A0005'
  ctx.beginPath()
  ctx.arc(sx, headY, 4, 0, Math.PI * 2)
  ctx.fill()

  // Inner mouth void (darker center)
  ctx.fillStyle = '#1A0010'
  ctx.beginPath()
  ctx.arc(sx, headY, 2, 0, Math.PI * 2)
  ctx.fill()

  // Teeth visible inside petals
  ctx.fillStyle = '#E8D8C0'
  ctx.fillRect(sx - 1, headY - 3, 1, 2)
  ctx.fillRect(sx + 1, headY - 3, 1, 2)
  ctx.fillRect(sx - 2, headY + 1, 1, 2)
  ctx.fillRect(sx + 2, headY + 1, 1, 2)

  // Warning — red glow around the whole creature when it first appears
  if (lifetime > 7.5) {
    const flashAlpha = Math.min(1, (9 - lifetime) * 2) * 0.5
    ctx.globalAlpha = flashAlpha
    ctx.strokeStyle = '#FF0000'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(sx, sy - 10, 22, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}
