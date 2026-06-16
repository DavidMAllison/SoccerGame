// GAME_W is mutable: landscape-phone mode widens it to show the full pitch.
export let GAME_W = 256
export const GAME_H = 240

// Phones have a minimum screen dimension ≤ 600 CSS px; tablets/iPads are wider.
const IS_PHONE = navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) <= 600

export interface Renderer {
  backbuffer: CanvasRenderingContext2D
  present(): void
  resize(windowW: number, windowH: number): void
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const display = canvas.getContext('2d')!

  let bb = new OffscreenCanvas(GAME_W, GAME_H)
  let bbCtx = bb.getContext('2d')!
  bbCtx.imageSmoothingEnabled = false

  function resize(windowW: number, windowH: number) {
    const isTouch = navigator.maxTouchPoints > 0
    const isLandscape = windowW > windowH

    // Landscape phones show the full 512px pitch width for an almost-fullscreen canvas.
    // Tablets/desktop keep the 256px view (higher zoom factor looks better there).
    const targetW = (IS_PHONE && isLandscape) ? 512 : 256
    if (targetW !== GAME_W) {
      GAME_W = targetW
      bb = new OffscreenCanvas(GAME_W, GAME_H)
      bbCtx = bb.getContext('2d')!
      bbCtx.imageSmoothingEnabled = false
    }

    let scale: number
    if (isTouch) {
      // Controls are fixed overlays. Reserve space so content isn't hidden under them.
      // Portrait: KICK button top sits at ~144px from bottom — reserve 150px.
      // Landscape: controls hug canvas edges, no height reservation needed.
      const controlsH = isLandscape ? 0 : 150
      const availH = windowH - controlsH
      scale = Math.min(windowW / GAME_W, availH / GAME_H)
    } else {
      // Desktop: integer scale for pixel-perfect rendering
      scale = Math.min(Math.floor(windowW / GAME_W), Math.floor(windowH / GAME_H)) || 1
    }

    const w = Math.round(GAME_W * scale)
    const h = Math.round(GAME_H * scale)
    canvas.width  = w
    canvas.height = h
    canvas.style.width  = `${w}px`
    canvas.style.height = `${h}px`
    display.imageSmoothingEnabled = false

    // Center the canvas vertically in the space above the touch controls
    const container = canvas.parentElement as HTMLElement | null
    if (container) {
      if (isTouch && !isLandscape) {
        const controlsH = 150
        const topMargin = Math.max(0, Math.floor((windowH - controlsH - h) / 2))
        container.style.marginTop = `${topMargin}px`
      } else {
        container.style.marginTop = ''
      }
    }
  }

  function present() {
    display.drawImage(bb, 0, 0, canvas.width, canvas.height)
  }

  return {
    get backbuffer() { return bbCtx as unknown as CanvasRenderingContext2D },
    present,
    resize,
  }
}

export function clearScreen(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, GAME_W, GAME_H)
}
