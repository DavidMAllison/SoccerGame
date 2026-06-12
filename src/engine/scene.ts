export interface Scene {
  onEnter?(): void
  onExit?(): void
  tick(dt: number): void
  render(ctx: CanvasRenderingContext2D, alpha: number): void
}

export class SceneManager {
  private current: Scene | null = null

  transition(next: Scene) {
    this.current?.onExit?.()
    this.current = next
    next.onEnter?.()
  }

  tick(dt: number) {
    this.current?.tick(dt)
  }

  render(ctx: CanvasRenderingContext2D, alpha: number) {
    this.current?.render(ctx, alpha)
  }
}
