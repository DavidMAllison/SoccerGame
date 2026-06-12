import type { MatchState } from '../types.js'
import { GAME_W } from '../../engine/renderer.js'

export function drawHud(ctx: CanvasRenderingContext2D, state: MatchState) {
  // Row 1 — scores + timer (0-18px)
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, GAME_W, 18)

  // Row 2 — controls hint (18-28px)
  ctx.fillStyle = '#0a0a14'
  ctx.fillRect(0, 18, GAME_W, 10)

  // Separator line between rows
  ctx.strokeStyle = '#2a2a44'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, 18); ctx.lineTo(GAME_W, 18)
  ctx.stroke()

  // Bottom border
  ctx.strokeStyle = '#444444'
  ctx.beginPath()
  ctx.moveTo(0, 28); ctx.lineTo(GAME_W, 28)
  ctx.stroke()

  // Team 0 score (red, left)
  ctx.fillStyle = '#ee3333'
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`RED  ${state.score[0]}`, 6, 13)

  // Timer + half indicator (centre, single line — no overlap)
  const mins = Math.floor(state.matchTimer / 60)
  const secs = Math.floor(state.matchTimer % 60)
  const timeStr = `H${state.half}  ${mins}:${secs.toString().padStart(2, '0')}`
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(timeStr, GAME_W / 2, 13)

  // Team 1 score (blue, right)
  ctx.fillStyle = '#3355ee'
  ctx.textAlign = 'right'
  ctx.fillText(`${state.score[1]}  BLU`, GAME_W - 6, 13)

  // Controls hint row
  const isMobile = navigator.maxTouchPoints > 0
  ctx.fillStyle = '#556655'
  ctx.font = '6px monospace'
  ctx.textAlign = 'center'
  if (isMobile) {
    ctx.fillText('D-PAD:MOVE   KICK:PASS/SWITCH   SHOOT:LOFT', GAME_W / 2, 26)
  } else {
    ctx.fillText('ARROWS:MOVE   Z:KICK/SWITCH   X:SHOOT   M:MUTE', GAME_W / 2, 26)
  }
}
