/**
 * AnimationController - Handles frame rate limiting and visibility-based pausing
 *
 * Features:
 * - Caps frame rate to target FPS (default 60)
 * - Automatically pauses when window/tab is hidden
 * - Resumes when window/tab becomes visible
 */

export class AnimationController {
  private animationId: number | null = null
  private lastFrameTime: number = 0
  private readonly frameInterval: number
  private isPaused: boolean = false
  private isStarted: boolean = false
  private readonly drawFn: () => void
  private readonly boundHandleVisibility: () => void

  constructor(drawFn: () => void, targetFPS: number = 60) {
    this.drawFn = drawFn
    this.frameInterval = 1000 / targetFPS
    this.boundHandleVisibility = this.handleVisibilityChange.bind(this)
    document.addEventListener('visibilitychange', this.boundHandleVisibility)
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.pause()
    } else if (this.isStarted) {
      this.resume()
    }
  }

  start(): void {
    this.isStarted = true
    if (!document.hidden) {
      this.isPaused = false
      this.lastFrameTime = performance.now()
      this.loop()
    }
  }

  private loop = (): void => {
    if (this.isPaused || !this.isStarted) return

    this.animationId = requestAnimationFrame(this.loop)

    const now = performance.now()
    const elapsed = now - this.lastFrameTime

    if (elapsed >= this.frameInterval) {
      // Adjust for drift
      this.lastFrameTime = now - (elapsed % this.frameInterval)
      this.drawFn()
    }
  }

  pause(): void {
    this.isPaused = true
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  resume(): void {
    if (this.isPaused && this.isStarted) {
      this.isPaused = false
      this.lastFrameTime = performance.now()
      this.loop()
    }
  }

  destroy(): void {
    document.removeEventListener('visibilitychange', this.boundHandleVisibility)
    this.isStarted = false
    this.pause()
  }
}
