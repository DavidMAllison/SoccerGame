export const GAME_W = 256
export const GAME_H = 240

export interface Renderer {
  backbuffer: CanvasRenderingContext2D
  present(): void
  resize(windowW: number, windowH: number): void
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const display = canvas.getContext('2d')!

  const bb = new OffscreenCanvas(GAME_W, GAME_H)
  const ctx = bb.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  function resize(windowW: number, windowH: number) {
    const isTouch = navigator.maxTouchPoints > 0

    let scale: number
    if (isTouch) {
      // Mobile: fill width, leave 120px at bottom for touch controls
      const availH = windowH - 120
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
  }

  function present() {
    display.drawImage(bb, 0, 0, canvas.width, canvas.height)
  }

  return { backbuffer: ctx as unknown as CanvasRenderingContext2D, present, resize }
}

export function clearScreen(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, GAME_W, GAME_H)
}
