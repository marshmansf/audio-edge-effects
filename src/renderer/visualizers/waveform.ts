export interface WaveformOptions {
  container: HTMLElement
  color?: string
  lineWidth?: number
  glowColor?: string
  glowIntensity?: number
}

export class WaveformVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private color: string
  private lineWidth: number
  private glowColor: string
  private glowIntensity: number

  constructor(options: WaveformOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.color = options.color || '#00ff00'
    this.lineWidth = options.lineWidth || 2
    this.glowColor = options.glowColor || '#00ff00'
    this.glowIntensity = options.glowIntensity || 10

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private handleResize(): void {
    const parent = this.canvas.parentElement
    if (parent) {
      this.canvas.width = parent.offsetWidth * window.devicePixelRatio
      this.canvas.height = parent.offsetHeight * window.devicePixelRatio
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
  }

  init(analyser: AnalyserNode): void {
    this.analyser = analyser
    this.dataArray = new Uint8Array(analyser.frequencyBinCount)
    this.draw()
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteTimeDomainData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height)

    // Set up glow effect
    this.ctx.shadowBlur = this.glowIntensity
    this.ctx.shadowColor = this.glowColor
    this.ctx.strokeStyle = this.color
    this.ctx.lineWidth = this.lineWidth
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'

    // Draw waveform
    // Position baseline 1 pixel inward from bottom edge
    // Only the upper half of the waveform will be visible
    this.ctx.beginPath()

    const sliceWidth = width / this.dataArray.length
    const baseline = height - 1  // 1 pixel from bottom edge
    let x = 0

    for (let i = 0; i < this.dataArray.length; i++) {
      const v = this.dataArray[i] / 128.0  // ~1.0 when silent, 0-2 range
      const deviation = v - 1  // -1 to 1 range
      // Scale deviation to use full visible height, baseline at bottom (3x magnitude)
      const y = baseline - (deviation * (height - 1) * 3)

      if (i === 0) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    this.ctx.stroke()
  }

  setColor(color: string): void {
    this.color = color
  }

  setGlowColor(color: string): void {
    this.glowColor = color
  }

  setGlowIntensity(intensity: number): void {
    this.glowIntensity = intensity
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    this.canvas.remove()
    window.removeEventListener('resize', () => this.handleResize())
  }
}
