const FIXED_DT = 1000 / 60 // 16.667ms per tick

export type TickFn = (dt: number) => void
export type RenderFn = (alpha: number) => void

export interface Loop {
  start(): void
  stop(): void
}

export function createLoop(tick: TickFn, render: RenderFn): Loop {
  let running = false
  let lastTime = 0
  let accumulator = 0
  let rafId = 0

  function frame(now: number) {
    if (!running) return

    const elapsed = Math.min(now - lastTime, 200) // cap at 200ms to avoid spiral of death
    lastTime = now
    accumulator += elapsed

    while (accumulator >= FIXED_DT) {
      tick(FIXED_DT / 1000) // pass seconds
      accumulator -= FIXED_DT
    }

    const alpha = accumulator / FIXED_DT
    render(alpha)

    rafId = requestAnimationFrame(frame)
  }

  return {
    start() {
      running = true
      lastTime = performance.now()
      accumulator = 0
      rafId = requestAnimationFrame(frame)
    },
    stop() {
      running = false
      cancelAnimationFrame(rafId)
    },
  }
}
