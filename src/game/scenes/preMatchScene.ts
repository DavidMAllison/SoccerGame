import type { Scene } from '../../engine/scene.js'
import { GAME_W, GAME_H } from '../../engine/renderer.js'
import type { MatchConfig } from '../types.js'
import type { CountryKit } from '../countries.js'

export class PreMatchScene implements Scene {
  private overlay: HTMLElement | null = null
  private nameInput: HTMLInputElement | null = null
  private onStart: ((name: string) => void) | null = null

  constructor(
    private config: Omit<MatchConfig, 'playerName'>,
    private canvas: HTMLCanvasElement,
    onStart: (name: string) => void,
  ) {
    this.onStart = onStart
  }

  onEnter() {
    this.buildOverlay()
  }

  onExit() {
    this.overlay?.remove()
    this.overlay = null
    this.nameInput = null
  }

  tick(_dt: number) {}

  render(ctx: CanvasRenderingContext2D, _alpha: number) {
    const [t0, t1] = this.config.teams
    const mid = GAME_W / 2

    // Left team panel
    ctx.fillStyle = t0.home
    ctx.fillRect(0, 0, mid, GAME_H)

    // Right team panel
    ctx.fillStyle = t1.home
    ctx.fillRect(mid, 0, mid, GAME_H)

    // VS strip
    ctx.fillStyle = '#000000'
    ctx.fillRect(mid - 12, 0, 24, GAME_H)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.save()
    ctx.translate(mid, GAME_H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('VS', 0, 3)
    ctx.restore()

    // Team flags + codes
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = t0.text
    ctx.fillText(t0.flag, mid / 2, GAME_H / 2 - 20)
    ctx.font = 'bold 9px monospace'
    ctx.fillText(t0.code, mid / 2, GAME_H / 2 - 6)

    ctx.fillStyle = t1.text
    ctx.font = 'bold 14px monospace'
    ctx.fillText(t1.flag, mid + mid / 2, GAME_H / 2 - 20)
    ctx.font = 'bold 9px monospace'
    ctx.fillText(t1.code, mid + mid / 2, GAME_H / 2 - 6)
  }

  private buildOverlay() {
    const [t0, t1] = this.config.teams
    const rect = this.canvas.getBoundingClientRect()
    const scale = rect.width / GAME_W

    const overlay = document.createElement('div')
    Object.assign(overlay.style, {
      position: 'fixed',
      left: rect.left + 'px',
      top: rect.top + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0',
      zIndex: '100',
      pointerEvents: 'none',
    })

    // Title
    const title = makeLabel('WORLD CUP 2026', {
      fontSize: Math.round(10 * scale) + 'px',
      color: '#ffffff',
      textShadow: '0 1px 3px #000',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      letterSpacing: '2px',
      marginBottom: Math.round(6 * scale) + 'px',
    })

    // Team names row
    const teamsRow = document.createElement('div')
    Object.assign(teamsRow.style, {
      display: 'flex', gap: Math.round(20 * scale) + 'px',
      marginBottom: Math.round(10 * scale) + 'px',
    })
    teamsRow.appendChild(teamLabel(t0, scale))
    teamsRow.appendChild(teamLabel(t1, scale))

    // Name input
    const inputWrap = document.createElement('div')
    Object.assign(inputWrap.style, {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: Math.round(4 * scale) + 'px',
      marginBottom: Math.round(10 * scale) + 'px',
      pointerEvents: 'auto',
    })

    const label = makeLabel('YOUR NAME', {
      fontSize: Math.round(8 * scale) + 'px',
      color: '#cccccc',
      fontFamily: 'monospace',
      letterSpacing: '1px',
    })

    const input = document.createElement('input')
    input.type = 'text'
    input.maxLength = 20
    input.placeholder = 'Enter your name'
    input.autocomplete = 'off'
    input.autocapitalize = 'words'
    Object.assign(input.style, {
      background: 'rgba(0,0,0,0.75)',
      border: '2px solid rgba(255,255,255,0.6)',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontSize: Math.round(10 * scale) + 'px',
      padding: Math.round(4 * scale) + 'px ' + Math.round(8 * scale) + 'px',
      borderRadius: '4px',
      textAlign: 'center',
      outline: 'none',
      width: Math.round(140 * scale) + 'px',
    })
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.submit()
      e.stopPropagation()  // prevent game input handler from consuming keys
    })
    this.nameInput = input

    inputWrap.appendChild(label)
    inputWrap.appendChild(input)

    // Kick off button
    const btn = document.createElement('button')
    btn.textContent = 'KICK OFF'
    Object.assign(btn.style, {
      background: '#ffff00',
      color: '#000000',
      border: 'none',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      fontSize: Math.round(10 * scale) + 'px',
      padding: Math.round(6 * scale) + 'px ' + Math.round(20 * scale) + 'px',
      borderRadius: '4px',
      cursor: 'pointer',
      pointerEvents: 'auto',
      letterSpacing: '2px',
    })
    btn.addEventListener('click', () => this.submit())

    overlay.appendChild(title)
    overlay.appendChild(teamsRow)
    overlay.appendChild(inputWrap)
    overlay.appendChild(btn)
    document.body.appendChild(overlay)
    this.overlay = overlay

    // Reposition if the window resizes (e.g. mobile keyboard)
    const vv = (window as unknown as { visualViewport?: { addEventListener: Function } }).visualViewport
    if (vv) {
      vv.addEventListener('resize', () => this.reposition())
      vv.addEventListener('scroll', () => this.reposition())
    }
    window.addEventListener('resize', () => this.reposition())

    // Focus input after a short delay so the canvas doesn't steal it
    setTimeout(() => input.focus(), 80)
  }

  private reposition() {
    if (!this.overlay || !this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    const vv = (window as unknown as { visualViewport?: { offsetTop?: number; height?: number } }).visualViewport
    // If mobile keyboard is open, anchor overlay at top of visible area
    const top = vv ? (vv.offsetTop ?? rect.top) : rect.top
    const height = vv ? (vv.height ?? rect.height) : rect.height
    Object.assign(this.overlay.style, {
      top: top + 'px',
      height: Math.min(height, rect.height) + 'px',
    })
    // Scroll input into view
    this.nameInput?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  private submit() {
    const name = (this.nameInput?.value.trim() ?? '').slice(0, 20) || 'ANON'
    this.onStart?.(name)
  }
}

function teamLabel(kit: CountryKit, scale: number): HTMLElement {
  const el = document.createElement('div')
  Object.assign(el.style, {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: Math.round(2 * scale) + 'px',
  })
  const flag = makeLabel(kit.flag, { fontSize: Math.round(20 * scale) + 'px' })
  const name = makeLabel(kit.name, {
    fontSize: Math.round(7 * scale) + 'px',
    color: '#ffffff',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textShadow: '0 1px 2px #000',
    maxWidth: Math.round(80 * scale) + 'px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  })
  el.appendChild(flag)
  el.appendChild(name)
  return el
}

function makeLabel(text: string, styles: Partial<CSSStyleDeclaration>): HTMLElement {
  const el = document.createElement('div')
  Object.assign(el.style, styles)
  el.textContent = text
  return el
}
