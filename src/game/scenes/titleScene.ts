import type { Scene } from '../../engine/scene.js'
import type { SceneManager } from '../../engine/scene.js'
import { GAME_W, GAME_H } from '../../engine/renderer.js'

export class TitleScene implements Scene {
  private blink = 0
  private showPress = true

  constructor(protected scenes: SceneManager) {}

  onEnter() { this.blink = 0; this.showPress = true }

  tick(dt: number) {
    this.blink += dt
    if (this.blink >= 0.5) { this.blink = 0; this.showPress = !this.showPress }
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number) {
    // NES-style dark background
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, GAME_W, GAME_H)

    // Crowd / stadium rows
    for (let row = 0; row < 5; row++) {
      ctx.fillStyle = row % 2 === 0 ? '#1a1a3a' : '#141430'
      ctx.fillRect(0, row * 8, GAME_W, 8)
    }

    // Pitch preview strip
    ctx.fillStyle = '#2a7a2a'
    ctx.fillRect(0, 150, GAME_W, GAME_H - 150)
    // Pitch markings
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(GAME_W / 2, GAME_H, 40, Math.PI, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(GAME_W / 2, 150); ctx.lineTo(GAME_W / 2, GAME_H)
    ctx.stroke()

    // Big title — NES block letters via pixel rects
    drawBlockText(ctx, 'SOCCER', GAME_W / 2 - 42, 44, '#ffffff', 2)

    // Yellow subtitle
    ctx.fillStyle = '#ffff00'
    ctx.font = '8px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('NINTENDO STYLE  1985', GAME_W / 2, 80)

    // Divider line
    ctx.fillStyle = '#446644'
    ctx.fillRect(20, 88, GAME_W - 40, 1)

    // Mode info
    ctx.fillStyle = '#aaaaff'
    ctx.font = '8px monospace'
    ctx.fillText('1 PLAYER vs CPU', GAME_W / 2, 104)

    ctx.fillStyle = '#888888'
    ctx.font = '7px monospace'
    ctx.fillText('P1: ARROWS + Z/X', GAME_W / 2, 120)
    ctx.fillText('Z = KICK   X = SHOOT', GAME_W / 2, 130)
    ctx.fillText('Z (no ball) = SWITCH PLAYER', GAME_W / 2, 140)

    // Press start (blinking)
    if (this.showPress) {
      ctx.fillStyle = '#ffffff'
      ctx.font = '8px monospace'
      const isMobile = navigator.maxTouchPoints > 0
      ctx.fillText(isMobile ? 'TAP  KICK  TO  START' : 'PRESS  Z  TO  START', GAME_W / 2, 162)
    }

    // Footer
    ctx.fillStyle = '#444466'
    ctx.font = '6px monospace'
    ctx.fillText('2024  SOCCER  REMAKE', GAME_W / 2, GAME_H - 6)
  }
}

// Draws chunky 5×7 block text via filled rectangles (no font needed)
function drawBlockText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  scale = 2,
) {
  // Simplified — just use bold canvas font at larger size for now.
  // Phase 5 polish: replace with pixel-font bitmaps.
  ctx.fillStyle = color
  ctx.font = `bold ${14 * scale}px monospace`
  ctx.textAlign = 'left'
  ctx.fillText(text, x, y + 14 * scale)
}
