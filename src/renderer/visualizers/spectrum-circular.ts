/**
 * Spectrum Circular Visualizer
 * Frequency bars spread across full width, fanning outward from bottom edge
 * Creates a "sunrise/fan" effect with bars radiating upward
 */

export interface SpectrumCircularOptions {
  container: HTMLElement
  barCount?: number
  colorScheme?: string
}

// Color schemes
const colorSchemes: Record<string, { inner: string, outer: string }> = {
  classic: { inner: '#00ff00', outer: '#88ff00' },
  blue: { inner: '#0066ff', outer: '#00ccff' },
  purple: { inner: '#6600ff', outer: '#cc00ff' },
  fire: { inner: '#ff3300', outer: '#ffcc00' },
  ice: { inner: '#0099ff', outer: '#ffffff' },
  light: { inner: '#cccccc', outer: '#ffffff' },
  dark: { inner: '#1a1a2e', outer: '#0f3460' },
  rainbow: { inner: '#ff0000', outer: '#00ff00' }
}

export class SpectrumCircularVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private barCount: number
  private colorScheme: string
  private smoothedData: number[] = []

  constructor(options: SpectrumCircularOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.barCount = options.barCount || 64
    this.colorScheme = options.colorScheme || 'classic'
    this.smoothedData = new Array(this.barCount).fill(0)

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private handleResize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect()
    if (rect) {
      this.canvas.width = rect.width * window.devicePixelRatio
      this.canvas.height = rect.height * window.devicePixelRatio
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

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height)

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Fan origin point - centered below bottom edge
    const originX = width / 2
    const originY = height + height * 2 // Far below for gentle fan angle

    // Calculate bar dimensions
    const barGap = 3
    const totalBarSpace = width - barGap * (this.barCount + 1)
    const barWidth = Math.max(2, totalBarSpace / this.barCount)
    const maxBarHeight = height * 2.5

    // Sample frequency data for each bar
    const binSize = Math.floor(this.dataArray.length * 0.6 / this.barCount)

    for (let i = 0; i < this.barCount; i++) {
      // Average the frequency bins for this bar
      let sum = 0
      for (let j = 0; j < binSize; j++) {
        sum += this.dataArray[i * binSize + j]
      }
      const rawValue = sum / binSize / 255

      // Smooth the data
      this.smoothedData[i] = this.smoothedData[i] * 0.7 + rawValue * 0.3

      const value = this.smoothedData[i]
      const barHeight = Math.max(4, value * maxBarHeight)

      // Calculate x position (spread across width)
      const x = barGap + i * (barWidth + barGap) + barWidth / 2

      // Calculate angle from origin to this bar position
      const dx = x - originX
      const baseY = height
      const dy = baseY - originY
      const angle = Math.atan2(dy, dx)

      // Bar starts from bottom edge
      const startX = x
      const startY = height

      // Bar extends in direction of angle
      const endX = startX + Math.cos(angle) * barHeight
      const endY = startY + Math.sin(angle) * barHeight

      // Create gradient along the bar
      const gradient = this.ctx.createLinearGradient(startX, startY, endX, endY)

      if (this.colorScheme === 'rainbow') {
        // Rainbow based on position
        const hue = (i / this.barCount) * 300
        gradient.addColorStop(0, `hsl(${hue}, 100%, 50%)`)
        gradient.addColorStop(1, `hsl(${hue + 60}, 100%, 65%)`)
      } else {
        gradient.addColorStop(0, scheme.inner)
        gradient.addColorStop(1, scheme.outer)
      }

      // Draw the bar as a thick line
      this.ctx.beginPath()
      this.ctx.strokeStyle = gradient
      this.ctx.lineWidth = barWidth
      this.ctx.lineCap = 'round'
      this.ctx.moveTo(startX, startY)
      this.ctx.lineTo(endX, endY)

      // Add glow effect
      this.ctx.shadowBlur = 6 + value * 8
      this.ctx.shadowColor = this.colorScheme === 'rainbow'
        ? `hsl(${(i / this.barCount) * 300}, 100%, 50%)`
        : scheme.inner

      this.ctx.stroke()
    }

    this.ctx.shadowBlur = 0
  }

  setColorScheme(scheme: string): void {
    if (colorSchemes[scheme]) {
      this.colorScheme = scheme
    }
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    this.canvas.remove()
    window.removeEventListener('resize', () => this.handleResize())
  }
}
