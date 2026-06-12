export interface FrameRect { x: number; y: number; w: number; h: number }

export interface Assets {
  spritesheet: HTMLImageElement | null
  atlas: Record<string, FrameRect>
}

// Phase 1 stub — real spritesheet loads in Phase 5
export async function loadAssets(): Promise<Assets> {
  let spritesheet: HTMLImageElement | null = null
  let atlas: Record<string, FrameRect> = {}

  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('missing'))
      img.src = '/assets/spritesheet.png'
    })
    spritesheet = img
  } catch { /* no spritesheet yet */ }

  try {
    const res = await fetch('/assets/spritesheet.json')
    if (res.ok) atlas = await res.json() as Record<string, FrameRect>
  } catch { /* no atlas yet */ }

  return { spritesheet, atlas }
}
