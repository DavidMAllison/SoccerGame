import type { MatchState } from '../types.js'
import { GAME_W } from '../../engine/renderer.js'

export function drawHud(ctx: CanvasRenderingContext2D, state: MatchState) {
  const { config } = state
  const [t0, t1] = config.teams

  // Row 1 — scores + timer (0-18px)
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, GAME_W, 18)

  // Row 2 — controls hint (18-28px)
  ctx.fillStyle = '#0a0a14'
  ctx.fillRect(0, 18, GAME_W, 10)

  // Separator + bottom border
  ctx.strokeStyle = '#2a2a44'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(GAME_W, 18); ctx.stroke()
  ctx.strokeStyle = '#444444'
  ctx.beginPath(); ctx.moveTo(0, 28); ctx.lineTo(GAME_W, 28); ctx.stroke()

  // Team 0 score (left) — use kit home color
  ctx.fillStyle = t0.home === '#EEEEEE' || t0.home === '#FFFFFF' ? '#cccccc' : t0.home
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`${t0.flag} ${t0.code}  ${state.score[0]}`, 4, 13)

  // Timer + half indicator (centre)
  const mins = Math.floor(state.matchTimer / 60)
  const secs = Math.floor(state.matchTimer % 60)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`H${state.half}  ${mins}:${secs.toString().padStart(2, '0')}`, GAME_W / 2, 13)

  // Team 1 score (right)
  ctx.fillStyle = t1.home === '#EEEEEE' || t1.home === '#FFFFFF' ? '#cccccc' : t1.home
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'right'
  ctx.fillText(`${state.score[1]}  ${t1.code} ${t1.flag}`, GAME_W - 4, 13)

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
