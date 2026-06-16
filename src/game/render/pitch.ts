import {
  PITCH_W, PITCH_H, PITCH_X, PITCH_Y,
  GOAL_WIDTH, GOAL_Y, GOAL_DEPTH,
} from '../constants.js'
import { GAME_W, GAME_H } from '../../engine/renderer.js'

const W = PITCH_W + GOAL_DEPTH * 2
const ox = GOAL_DEPTH  // baked horizontal offset

let cached: OffscreenCanvas | null = null
let cachedTheme = -1

export function getPitchCanvas(theme: number): OffscreenCanvas {
  if (cached && cachedTheme === theme) return cached
  cached = new OffscreenCanvas(W, GAME_H)
  cachedTheme = theme
  const ctx = cached.getContext('2d')!
  drawTheme(ctx, theme)
  return cached
}

export function drawPitch(ctx: CanvasRenderingContext2D, cameraX: number, theme: number) {
  const pitchCanvas = getPitchCanvas(theme)
  if (GAME_W >= PITCH_W) {
    // Landscape full-pitch view: draw the entire pitch canvas (W=536) scaled into GAME_W.
    // 4% horizontal scale difference is imperceptible and shows both goal nets.
    ctx.drawImage(pitchCanvas as unknown as CanvasImageSource, 0, 0, W, GAME_H, 0, 0, GAME_W, GAME_H)
  } else {
    ctx.drawImage(
      pitchCanvas as unknown as CanvasImageSource,
      Math.round(cameraX), 0,
      GAME_W, GAME_H,
      0, 0,
      GAME_W, GAME_H,
    )
  }
}

// ─── Theme dispatcher ─────────────────────────────────────────────────────────

function drawTheme(ctx: OffscreenCanvasRenderingContext2D, theme: number) {
  switch (theme) {
    case 1: drawRoblox(ctx); break
    case 2: drawMarioStrikers(ctx); break
    case 3: drawMinecraft(ctx); break
    case 4: drawFIFA(ctx); break
    default: drawClassic(ctx); break
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function drawGoalNets(
  ctx: OffscreenCanvasRenderingContext2D,
  netFill: string,
  lineColor: string,
) {
  ctx.fillStyle = netFill
  ctx.fillRect(ox - GOAL_DEPTH, GOAL_Y, GOAL_DEPTH, GOAL_WIDTH)
  ctx.fillRect(ox + PITCH_W, GOAL_Y, GOAL_DEPTH, GOAL_WIDTH)
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 1
  for (let y = GOAL_Y; y <= GOAL_Y + GOAL_WIDTH; y += 8) {
    ctx.beginPath(); ctx.moveTo(ox - GOAL_DEPTH, y); ctx.lineTo(ox, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ox + PITCH_W, y); ctx.lineTo(ox + PITCH_W + GOAL_DEPTH, y); ctx.stroke()
  }
  for (let x = ox - GOAL_DEPTH; x <= ox; x += 8) {
    ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_WIDTH); ctx.stroke()
  }
  for (let x = ox + PITCH_W; x <= ox + PITCH_W + GOAL_DEPTH; x += 8) {
    ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_WIDTH); ctx.stroke()
  }
}

function drawPitchMarkings(
  ctx: OffscreenCanvasRenderingContext2D,
  lineColor: string,
  postColor: string,
) {
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 1
  ctx.strokeRect(ox + 1, PITCH_Y + 1, PITCH_W - 2, PITCH_H - 2)
  ctx.beginPath()
  ctx.moveTo(ox + PITCH_W / 2, PITCH_Y)
  ctx.lineTo(ox + PITCH_W / 2, PITCH_Y + PITCH_H)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(ox + PITCH_W / 2, PITCH_Y + PITCH_H / 2, 28, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = lineColor
  ctx.beginPath()
  ctx.arc(ox + PITCH_W / 2, PITCH_Y + PITCH_H / 2, 2, 0, Math.PI * 2)
  ctx.fill()
  const penW = 52, penH = 90, penY = PITCH_Y + (PITCH_H - penH) / 2
  ctx.strokeRect(ox, penY, penW, penH)
  ctx.strokeRect(ox + PITCH_W - penW, penY, penW, penH)
  const gbW = 18, gbH = GOAL_WIDTH + 12, gbY = PITCH_Y + (PITCH_H - gbH) / 2
  ctx.strokeRect(ox, gbY, gbW, gbH)
  ctx.strokeRect(ox + PITCH_W - gbW, gbY, gbW, gbH)
  ctx.fillStyle = lineColor
  ctx.beginPath(); ctx.arc(ox + 38, PITCH_Y + PITCH_H / 2, 2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(ox + PITCH_W - 38, PITCH_Y + PITCH_H / 2, 2, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = postColor
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(ox, GOAL_Y); ctx.lineTo(ox, GOAL_Y + GOAL_WIDTH)
  ctx.moveTo(ox + PITCH_W, GOAL_Y); ctx.lineTo(ox + PITCH_W, GOAL_Y + GOAL_WIDTH)
  ctx.stroke()
}

// ─── Theme 0: Classic NES ─────────────────────────────────────────────────────

function drawClassic(ctx: OffscreenCanvasRenderingContext2D) {
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, W, GAME_H)
  const stripe = 32
  for (let i = 0; i < Math.ceil(PITCH_W / stripe); i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2a7a2a' : '#257025'
    ctx.fillRect(ox + PITCH_X + i * stripe, PITCH_Y, stripe, PITCH_H)
  }
  drawGoalNets(ctx, '#555566', '#8888aa')
  drawPitchMarkings(ctx, '#ffffff', '#ffffff')
}

// ─── Theme 1: Roblox ─────────────────────────────────────────────────────────

function drawRoblox(ctx: OffscreenCanvasRenderingContext2D) {
  // Gray brick stands
  ctx.fillStyle = '#888888'
  ctx.fillRect(0, 0, W, GAME_H)

  // Brick pattern in stands
  ctx.fillStyle = '#777777'
  const brickW = 16, brickH = 8
  for (let row = 0; row < Math.ceil(GAME_H / brickH); row++) {
    const offset = (row % 2) * (brickW / 2)
    for (let col = -1; col < Math.ceil(W / brickW) + 1; col++) {
      const bx = col * brickW + offset
      const by = row * brickH
      // Only draw bricks in the crowd zone, not on the pitch
      const onPitch = bx + brickW > ox && bx < ox + PITCH_W && by + brickH > PITCH_Y && by < PITCH_Y + PITCH_H
      if (!onPitch) {
        ctx.strokeStyle = '#666666'
        ctx.lineWidth = 1
        ctx.strokeRect(bx, by, brickW - 1, brickH - 1)
      }
    }
  }

  // Yellow Roblox banner strips along the sides
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(0, PITCH_Y - 4, W, 4)
  ctx.fillRect(0, PITCH_Y + PITCH_H, W, 4)

  // Checkerboard tile field (light gray)
  const tile = 16
  for (let row = 0; row < Math.ceil(PITCH_H / tile); row++) {
    for (let col = 0; col < Math.ceil(PITCH_W / tile); col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#D4D4D4' : '#C0C0C0'
      ctx.fillRect(ox + col * tile, PITCH_Y + row * tile, tile, tile)
    }
  }

  // Roblox logo-style "R" blocks in crowd corners
  const logoColor = '#CC0000'
  ctx.fillStyle = logoColor
  // top-left corner block
  ctx.fillRect(4, 4, 20, 20)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(6, 6, 16, 6)   // R top bar
  ctx.fillRect(6, 6, 4, 14)   // R stem
  ctx.fillRect(12, 12, 8, 4)  // R middle bar
  ctx.fillRect(16, 16, 6, 4)  // R leg
  // top-right
  ctx.fillStyle = logoColor
  ctx.fillRect(W - 24, 4, 20, 20)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(W - 22, 6, 16, 6)
  ctx.fillRect(W - 22, 6, 4, 14)
  ctx.fillRect(W - 16, 12, 8, 4)
  ctx.fillRect(W - 12, 16, 6, 4)

  // Yellow goal boxes (Roblox-style)
  ctx.fillStyle = '#CC8800'
  ctx.fillRect(ox - GOAL_DEPTH, GOAL_Y, GOAL_DEPTH, GOAL_WIDTH)
  ctx.fillRect(ox + PITCH_W, GOAL_Y, GOAL_DEPTH, GOAL_WIDTH)
  ctx.fillStyle = '#FFD700'
  ctx.lineWidth = 2
  ctx.strokeStyle = '#FFD700'
  ctx.strokeRect(ox - GOAL_DEPTH, GOAL_Y, GOAL_DEPTH, GOAL_WIDTH)
  ctx.strokeRect(ox + PITCH_W, GOAL_Y, GOAL_DEPTH, GOAL_WIDTH)

  // Red markings (Roblox red)
  drawPitchMarkings(ctx, '#CC0000', '#FFD700')
}

// ─── Theme 2: Mario Strikers ──────────────────────────────────────────────────

function drawMarioStrikers(ctx: OffscreenCanvasRenderingContext2D) {
  // Dark electric night stadium
  ctx.fillStyle = '#080818'
  ctx.fillRect(0, 0, W, GAME_H)

  // Electric stands — purple gradient rows
  const standColors = ['#1A0040', '#220055', '#2A006A', '#320080']
  const rowH = 7
  for (let row = 0; row < 4; row++) {
    ctx.fillStyle = standColors[row]
    // Top stands
    ctx.fillRect(0, row * rowH, W, rowH)
    // Bottom stands
    ctx.fillRect(0, PITCH_Y + PITCH_H + row * rowH, W, rowH)
  }

  // Crowd silhouettes (tiny blocky figures)
  ctx.fillStyle = '#3D006B'
  for (let x = 0; x < W; x += 10) {
    const h = 4 + (x % 3) * 2
    ctx.fillRect(x, PITCH_Y - 6 - h, 7, h)          // top crowd
    ctx.fillRect(x, PITCH_Y + PITCH_H + 4, 7, h)    // bottom crowd
  }

  // Electric yellow border glow
  ctx.fillStyle = '#FFE000'
  ctx.fillRect(0, PITCH_Y - 2, W, 2)
  ctx.fillRect(0, PITCH_Y + PITCH_H, W, 2)

  // Neon dark-green field with bright stripes
  const stripe = 32
  for (let i = 0; i < Math.ceil(PITCH_W / stripe); i++) {
    ctx.fillStyle = i % 2 === 0 ? '#0A3A0A' : '#0D4A0D'
    ctx.fillRect(ox + i * stripe, PITCH_Y, stripe, PITCH_H)
  }

  // Electric arcs at centre circle (just a few bright pixels)
  ctx.fillStyle = '#FFE000'
  const cx = ox + PITCH_W / 2, cy = PITCH_Y + PITCH_H / 2
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const r = 28
    const x = Math.round(cx + Math.cos(angle) * r)
    const y = Math.round(cy + Math.sin(angle) * r)
    ctx.fillRect(x - 1, y - 1, 3, 3)
  }

  // Question mark blocks at 4 corners of centre circle
  const qColor = '#FF8C00'
  const qBlocks = [
    [cx - 38, cy - 16], [cx + 34, cy - 16],
    [cx - 38, cy + 12], [cx + 34, cy + 12],
  ]
  for (const [qx, qy] of qBlocks) {
    ctx.fillStyle = qColor
    ctx.fillRect(qx, qy, 10, 10)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(qx + 3, qy + 2, 4, 2)  // top of ?
    ctx.fillRect(qx + 5, qy + 4, 2, 2)  // stem of ?
    ctx.fillRect(qx + 3, qy + 7, 4, 2)  // dot of ?
  }

  // Electrified goal cages
  ctx.fillStyle = '#442200'
  ctx.fillRect(ox - GOAL_DEPTH, GOAL_Y, GOAL_DEPTH, GOAL_WIDTH)
  ctx.fillRect(ox + PITCH_W, GOAL_Y, GOAL_DEPTH, GOAL_WIDTH)
  ctx.strokeStyle = '#FF8C00'
  ctx.lineWidth = 1
  for (let y = GOAL_Y; y <= GOAL_Y + GOAL_WIDTH; y += 6) {
    ctx.beginPath(); ctx.moveTo(ox - GOAL_DEPTH, y); ctx.lineTo(ox, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ox + PITCH_W, y); ctx.lineTo(ox + PITCH_W + GOAL_DEPTH, y); ctx.stroke()
  }
  for (let x = ox - GOAL_DEPTH; x <= ox; x += 6) {
    ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_WIDTH); ctx.stroke()
  }
  for (let x = ox + PITCH_W; x <= ox + PITCH_W + GOAL_DEPTH; x += 6) {
    ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_WIDTH); ctx.stroke()
  }

  // Neon yellow markings
  drawPitchMarkings(ctx, '#FFE000', '#FF8C00')
}

// ─── Theme 3: Minecraft ───────────────────────────────────────────────────────

function drawMinecraft(ctx: OffscreenCanvasRenderingContext2D) {
  // Sky blue background
  ctx.fillStyle = '#6AB0DC'
  ctx.fillRect(0, 0, W, GAME_H)

  // Blocky pixel clouds
  ctx.fillStyle = '#FFFFFF'
  const clouds = [[30, 4], [110, 6], [200, 3], [320, 5], [430, 4], [500, 7]]
  for (const [cx, cy] of clouds) {
    ctx.fillRect(cx, cy, 24, 8)
    ctx.fillRect(cx + 4, cy - 4, 16, 4)
    ctx.fillRect(cx + 8, cy - 8, 8, 4)
  }

  // Dirt band below sky (top crowd area)
  ctx.fillStyle = '#866043'
  ctx.fillRect(0, PITCH_Y - 8, W, 8)

  // Grass-block top strip
  ctx.fillStyle = '#5D8A1C'
  ctx.fillRect(0, PITCH_Y - 4, W, 4)

  // Bottom dirt crowd area
  ctx.fillStyle = '#866043'
  ctx.fillRect(0, PITCH_Y + PITCH_H, W, GAME_H - (PITCH_Y + PITCH_H))

  // Cobblestone side borders
  const stoneColors = ['#888888', '#777777', '#999999', '#888888']
  const stoneW = 8, stoneH = 8
  for (let row = 0; row < Math.ceil(PITCH_H / stoneH); row++) {
    const col = Math.floor(row / 2) % stoneColors.length
    ctx.fillStyle = stoneColors[col]
    // Left border
    ctx.fillRect(ox - GOAL_DEPTH - stoneW, PITCH_Y + row * stoneH, stoneW, stoneH - 1)
    // Right border
    ctx.fillRect(ox + PITCH_W + GOAL_DEPTH, PITCH_Y + row * stoneH, stoneW, stoneH - 1)
  }

  // Grass-block field — green top with dirt texture
  const grassTop = '#5D8A1C'
  const dirtMid = '#7C9A3A'
  const dirtDark = '#6B8A2E'
  const stripeW = 32
  for (let i = 0; i < Math.ceil(PITCH_W / stripeW); i++) {
    // Alternating grass shades
    ctx.fillStyle = i % 2 === 0 ? dirtMid : dirtDark
    ctx.fillRect(ox + i * stripeW, PITCH_Y, stripeW, PITCH_H)
    // Green top edge on each stripe (grass block look)
    ctx.fillStyle = grassTop
    ctx.fillRect(ox + i * stripeW, PITCH_Y, stripeW, 3)
  }

  // Block-style pixel dirt dots for texture
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  for (let y = PITCH_Y + 8; y < PITCH_Y + PITCH_H; y += 16) {
    for (let x = ox + 8; x < ox + PITCH_W; x += 16) {
      ctx.fillRect(x, y, 4, 4)
      ctx.fillRect(x + 8, y + 8, 4, 4)
    }
  }

  // Stone-block goal cages (cobblestone)
  for (let row = 0; row < Math.ceil(GOAL_WIDTH / stoneH); row++) {
    const shade = row % 2 === 0 ? '#999999' : '#777777'
    ctx.fillStyle = shade
    ctx.fillRect(ox - GOAL_DEPTH, GOAL_Y + row * stoneH, GOAL_DEPTH, stoneH - 1)
    ctx.fillRect(ox + PITCH_W, GOAL_Y + row * stoneH, GOAL_DEPTH, stoneH - 1)
  }
  // Stone grid lines on goal
  ctx.strokeStyle = '#555555'
  ctx.lineWidth = 1
  for (let y = GOAL_Y; y <= GOAL_Y + GOAL_WIDTH; y += stoneH) {
    ctx.beginPath(); ctx.moveTo(ox - GOAL_DEPTH, y); ctx.lineTo(ox, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ox + PITCH_W, y); ctx.lineTo(ox + PITCH_W + GOAL_DEPTH, y); ctx.stroke()
  }
  for (let x = ox - GOAL_DEPTH; x <= ox; x += stoneW) {
    ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_WIDTH); ctx.stroke()
  }
  for (let x = ox + PITCH_W; x <= ox + PITCH_W + GOAL_DEPTH; x += stoneW) {
    ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_WIDTH); ctx.stroke()
  }

  // White quartz-style markings
  drawPitchMarkings(ctx, '#FFFFFF', '#DDDDDD')
}

// ─── Theme 4: FIFA Premium Stadium ───────────────────────────────────────────

function drawFIFA(ctx: OffscreenCanvasRenderingContext2D) {
  // ── Background (dark stadium interior) ──────────────────────────────────────
  ctx.fillStyle = '#06090F'
  ctx.fillRect(0, 0, W, GAME_H)

  // ── Upper stands (0 to PITCH_Y = 28px) ──────────────────────────────────────
  // Roof shadow strip
  ctx.fillStyle = '#0A0D1A'
  ctx.fillRect(0, 0, W, 5)

  // Tier 2 — back seating (dark navy)
  ctx.fillStyle = '#0F1C38'
  ctx.fillRect(0, 5, W, 7)

  // Tier 1 — mid seating (slightly lighter)
  ctx.fillStyle = '#132444'
  ctx.fillRect(0, 12, W, 6)

  // Front crowd row (most visible, densest color)
  ctx.fillStyle = '#192E56'
  ctx.fillRect(0, 18, W, 4)

  // Crowd pixels — scatter colored fans across all three tiers
  const fanColors = ['#CC1100', '#0033BB', '#FFFFFF', '#EE9900', '#008833', '#BB0044', '#555599']
  for (let x = 1; x < W - 1; x += 3) {
    for (let y = 5; y < 22; y += 3) {
      ctx.fillStyle = fanColors[((x * 7) + (y * 13)) % fanColors.length]
      ctx.fillRect(x, y, 2, 2)
    }
  }

  // Advertising boards — colourful panels right above pitch
  const boardPalette = ['#E8E8E8', '#CC0000', '#E8E8E8', '#003399', '#E8E8E8', '#009900', '#E8E8E8', '#FF6600']
  const boardW = 22
  for (let i = 0; i <= Math.ceil(W / boardW); i++) {
    ctx.fillStyle = boardPalette[i % boardPalette.length]
    ctx.fillRect(i * boardW, PITCH_Y - 6, boardW - 1, 5)
  }
  // Thin dark separator between boards and pitch
  ctx.fillStyle = '#222222'
  ctx.fillRect(0, PITCH_Y - 1, W, 1)

  // ── Lower stands (PITCH_Y + PITCH_H to GAME_H = 228 to 240 = 12px) ──────────
  // Advertising boards right below pitch
  ctx.fillStyle = '#111111'
  ctx.fillRect(0, PITCH_Y + PITCH_H, W, 1)
  for (let i = 0; i <= Math.ceil(W / boardW); i++) {
    ctx.fillStyle = boardPalette[(i + 4) % boardPalette.length]
    ctx.fillRect(i * boardW, PITCH_Y + PITCH_H + 1, boardW - 1, 5)
  }
  // Crowd strip below boards
  ctx.fillStyle = '#192E56'
  ctx.fillRect(0, PITCH_Y + PITCH_H + 6, W, GAME_H - (PITCH_Y + PITCH_H + 6))
  for (let x = 1; x < W - 1; x += 3) {
    ctx.fillStyle = fanColors[((x * 11) + 77) % fanColors.length]
    ctx.fillRect(x, PITCH_Y + PITCH_H + 7, 2, 2)
  }

  // ── Grass — tight mowing stripes ─────────────────────────────────────────────
  const stripeW = 14
  for (let i = 0; i <= Math.ceil(PITCH_W / stripeW); i++) {
    ctx.fillStyle = i % 2 === 0 ? '#256B28' : '#2E8032'
    ctx.fillRect(ox + i * stripeW, PITCH_Y, stripeW, PITCH_H)
  }

  // Subtle edge darkening on pitch border (gives depth)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(ox, PITCH_Y, PITCH_W, 3)
  ctx.fillRect(ox, PITCH_Y + PITCH_H - 3, PITCH_W, 3)

  // ── Goal nets (white fine mesh) ───────────────────────────────────────────────
  ctx.fillStyle = 'rgba(245,245,245,0.10)'
  ctx.fillRect(ox - GOAL_DEPTH, GOAL_Y, GOAL_DEPTH, GOAL_WIDTH)
  ctx.fillRect(ox + PITCH_W, GOAL_Y, GOAL_DEPTH, GOAL_WIDTH)
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 1
  for (let y = GOAL_Y; y <= GOAL_Y + GOAL_WIDTH; y += 5) {
    ctx.beginPath(); ctx.moveTo(ox - GOAL_DEPTH, y); ctx.lineTo(ox, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ox + PITCH_W, y); ctx.lineTo(ox + PITCH_W + GOAL_DEPTH, y); ctx.stroke()
  }
  for (let x = ox - GOAL_DEPTH; x <= ox; x += 5) {
    ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_WIDTH); ctx.stroke()
  }
  for (let x = ox + PITCH_W; x <= ox + PITCH_W + GOAL_DEPTH; x += 5) {
    ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_WIDTH); ctx.stroke()
  }

  // ── Pitch markings (crisp white) ─────────────────────────────────────────────
  drawPitchMarkings(ctx, '#FFFFFF', '#DDDDDD')

  // ── Corner flags ─────────────────────────────────────────────────────────────
  const flagCorners = [
    [ox, PITCH_Y], [ox + PITCH_W, PITCH_Y],
    [ox, PITCH_Y + PITCH_H], [ox + PITCH_W, PITCH_Y + PITCH_H],
  ] as const
  for (const [fx, fy] of flagCorners) {
    const poleDir = fy === PITCH_Y ? -1 : 1
    ctx.strokeStyle = '#CCCCCC'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(fx, fy)
    ctx.lineTo(fx, fy + poleDir * 9)
    ctx.stroke()
    ctx.fillStyle = '#FF3333'
    ctx.beginPath()
    ctx.moveTo(fx, fy + poleDir * 9)
    ctx.lineTo(fx + 6, fy + poleDir * 6)
    ctx.lineTo(fx, fy + poleDir * 3)
    ctx.closePath()
    ctx.fill()
  }

  // ── Floodlight glow on pitch (subtle centre-brightness) ─────────────────────
  // Draw a faint bright overlay near centre to simulate floodlight focus
  ctx.fillStyle = 'rgba(255,255,240,0.04)'
  ctx.fillRect(ox + PITCH_W / 2 - 80, PITCH_Y, 160, PITCH_H)
  ctx.fillStyle = 'rgba(255,255,240,0.03)'
  ctx.fillRect(ox + PITCH_W / 2 - 130, PITCH_Y, 260, PITCH_H)
}
