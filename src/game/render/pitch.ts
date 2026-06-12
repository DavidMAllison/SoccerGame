import {
  PITCH_W, PITCH_H, PITCH_X, PITCH_Y,
  GOAL_WIDTH, GOAL_Y, GOAL_DEPTH,
} from '../constants.js'
import { GAME_H } from '../../engine/renderer.js'

// Pre-renders full 512px-wide pitch once; sliced by camera at draw time
let cached: OffscreenCanvas | null = null

export function getPitchCanvas(): OffscreenCanvas {
  if (cached) return cached

  // Extra width for goals sticking out past end lines
  cached = new OffscreenCanvas(PITCH_W + GOAL_DEPTH * 2, GAME_H)
  const ctx = cached.getContext('2d')!
  draw(ctx)
  return cached
}

function draw(ctx: OffscreenCanvasRenderingContext2D) {
  const ox = GOAL_DEPTH  // horizontal offset so PITCH_X=0 maps to ox pixels in

  // Background (crowd / border)
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, PITCH_W + GOAL_DEPTH * 2, GAME_H)

  // Alternating grass stripes (32px wide)
  const stripe = 32
  for (let i = 0; i < Math.ceil(PITCH_W / stripe); i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2a7a2a' : '#257025'
    ctx.fillRect(ox + PITCH_X + i * stripe, PITCH_Y, stripe, PITCH_H)
  }

  // Goals (grey nets behind end lines)
  ctx.fillStyle = '#555566'
  ctx.fillRect(ox - GOAL_DEPTH, GOAL_Y, GOAL_DEPTH, GOAL_WIDTH)  // left
  ctx.fillRect(ox + PITCH_W, GOAL_Y, GOAL_DEPTH, GOAL_WIDTH)      // right

  ctx.strokeStyle = '#8888aa'
  ctx.lineWidth = 1
  // Left goal net lines
  for (let y = GOAL_Y; y <= GOAL_Y + GOAL_WIDTH; y += 8) {
    ctx.beginPath(); ctx.moveTo(ox - GOAL_DEPTH, y); ctx.lineTo(ox, y); ctx.stroke()
  }
  for (let x = ox - GOAL_DEPTH; x <= ox; x += 8) {
    ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_WIDTH); ctx.stroke()
  }
  // Right goal net lines
  for (let y = GOAL_Y; y <= GOAL_Y + GOAL_WIDTH; y += 8) {
    ctx.beginPath(); ctx.moveTo(ox + PITCH_W, y); ctx.lineTo(ox + PITCH_W + GOAL_DEPTH, y); ctx.stroke()
  }
  for (let x = ox + PITCH_W; x <= ox + PITCH_W + GOAL_DEPTH; x += 8) {
    ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_WIDTH); ctx.stroke()
  }

  // White pitch markings
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1

  // Pitch border
  ctx.strokeRect(ox + 1, PITCH_Y + 1, PITCH_W - 2, PITCH_H - 2)

  // Centre line
  ctx.beginPath()
  ctx.moveTo(ox + PITCH_W / 2, PITCH_Y)
  ctx.lineTo(ox + PITCH_W / 2, PITCH_Y + PITCH_H)
  ctx.stroke()

  // Centre circle
  ctx.beginPath()
  ctx.arc(ox + PITCH_W / 2, PITCH_Y + PITCH_H / 2, 28, 0, Math.PI * 2)
  ctx.stroke()

  // Centre spot
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(ox + PITCH_W / 2, PITCH_Y + PITCH_H / 2, 2, 0, Math.PI * 2)
  ctx.fill()

  // Penalty areas
  const penW = 52, penH = 90
  const penY = PITCH_Y + (PITCH_H - penH) / 2
  ctx.strokeStyle = '#ffffff'
  ctx.strokeRect(ox, penY, penW, penH)
  ctx.strokeRect(ox + PITCH_W - penW, penY, penW, penH)

  // Goal boxes
  const gbW = 18, gbH = GOAL_WIDTH + 12
  const gbY = PITCH_Y + (PITCH_H - gbH) / 2
  ctx.strokeRect(ox, gbY, gbW, gbH)
  ctx.strokeRect(ox + PITCH_W - gbW, gbY, gbW, gbH)

  // Penalty spots
  ctx.fillStyle = '#ffffff'
  ctx.beginPath(); ctx.arc(ox + 38, PITCH_Y + PITCH_H / 2, 2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(ox + PITCH_W - 38, PITCH_Y + PITCH_H / 2, 2, 0, Math.PI * 2); ctx.fill()

  // Goal posts (white bars on end lines)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(ox, GOAL_Y); ctx.lineTo(ox, GOAL_Y + GOAL_WIDTH)
  ctx.moveTo(ox + PITCH_W, GOAL_Y); ctx.lineTo(ox + PITCH_W, GOAL_Y + GOAL_WIDTH)
  ctx.stroke()
}

export function drawPitch(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
) {
  const pitchCanvas = getPitchCanvas()
  // Source: slice at (cameraX, 0) from the pitch canvas
  // The pitch canvas has GOAL_DEPTH offset baked in, so source x = cameraX
  ctx.drawImage(
    pitchCanvas as unknown as CanvasImageSource,
    Math.round(cameraX), 0,
    256, 240,
    0, 0,
    256, 240,
  )
}
