/**
 * Spectrogram Visualizer
 * Scrolling time-frequency waterfall display
 * Frequency on Y-axis, time scrolls horizontally, color = intensity
 * Uses history array for proper transparency
 */

export interface SpectrogramOptions {
  container: HTMLElement
  colorScheme?: string
}

// Color schemes - define color gradients for intensity mapping
const colorSchemes: Record<string, string[]> = {
  classic: ['#003300', '#006600', '#00aa00', '#00ff00', '#88ff00', '#ffff00'],
  blue: ['#000066', '#0000aa', '#0044ff', '#0088ff', '#00ccff', '#ffffff'],
  purple: ['#220044', '#440066', '#6600aa', '#aa00ff', '#cc00ff', '#ff88ff'],
  fire: ['#330000', '#660000', '#aa2200', '#ff4400', '#ff8800', '#ffff00'],
  ice: ['#002244', '#004466', '#0066aa', '#0099ff', '#00ccff', '#ffffff'],
  light: ['#333333', '#555555', '#777777', '#999999', '#cccccc', '#ffffff'],
  dark: ['#0a0a15', '#141428', '#1e1e3c', '#282850', '#323264', '#46468c'],
  rainbow: ['#0000ff', '#00ffff', '#00ff00', '#ffff00', '#ff8800', '#ff0000']
}

export class SpectrogramVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private history: number[][] = []
  private maxHistory: number = 0

  constructor(options: SpectrogramOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private handleResize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect()
    if (rect) {
      this.canvas.width = rect.width * window.devicePixelRatio
      this.canvas.height = rect.height * window.devicePixelRatio
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

      // Calculate max history based on width (4x faster scroll)
      const width = rect.width
      this.maxHistory = Math.ceil(width / 8) // 8px per column for faster scroll

      // Trim history if needed
      while (this.history.length > this.maxHistory) {
        this.history.shift()
      }
    }
  }

  init(analyser: AnalyserNode): void {
    this.analyser = analyser
    this.dataArray = new Uint8Array(analyser.frequencyBinCount)
    this.draw()
  }

  private getColorForIntensity(intensity: number, ageFactor: number): string | null {
    // Return null for very low intensity (transparent)
    if (intensity < 0.08) return null

    const colors = colorSchemes[this.colorScheme] || colorSchemes.classic
    // Adjust intensity to start from threshold
    const adjustedIntensity = (intensity - 0.08) / 0.92
    const index = Math.min(Math.floor(adjustedIntensity * (colors.length - 1)), colors.length - 1)
    const nextIndex = Math.min(index + 1, colors.length - 1)
    const t = (adjustedIntensity * (colors.length - 1)) - index

    // Interpolate between colors
    const c1 = this.hexToRgb(colors[index])
    const c2 = this.hexToRgb(colors[nextIndex])

    const r = Math.round(c1.r + (c2.r - c1.r) * t)
    const g = Math.round(c1.g + (c2.g - c1.g) * t)
    const b = Math.round(c1.b + (c2.b - c1.b) * t)

    // Alpha based on intensity, fading out with age
    // ageFactor: 1 = newest (full opacity), 0 = oldest (faded out)
    const baseAlpha = 0.3 + adjustedIntensity * 0.7
    const alpha = baseAlpha * ageFactor

    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear canvas completely (transparent)
    this.ctx.clearRect(0, 0, width, height)

    // Sample current frequency data
    const binsToUse = Math.min(this.dataArray.length, Math.floor(height))
    const currentSlice: number[] = []

    for (let i = 0; i < binsToUse; i++) {
      const binIndex = Math.floor(i / binsToUse * this.dataArray.length * 0.5) // Use lower half of spectrum
      currentSlice.push(this.dataArray[binIndex] / 255)
    }

    // Add to history
    this.history.push(currentSlice)
    while (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    // Draw all history columns
    const columnWidth = 6 // Wider columns for faster visual scroll

    for (let col = 0; col < this.history.length; col++) {
      const slice = this.history[col]
      const x = (col / this.maxHistory) * width

      // Age factor: oldest (col=0) fades out, newest (col=history.length-1) is full
      const ageFactor = (col + 1) / this.history.length

      for (let i = 0; i < slice.length; i++) {
        const intensity = slice[i]
        const color = this.getColorForIntensity(intensity, ageFactor)

        if (color) {
          // Y position: low frequencies at bottom (near screen edge)
          const y = height - 1 - (i / slice.length) * height
          const cellHeight = height / slice.length + 1

          this.ctx.fillStyle = color
          this.ctx.fillRect(x, y, columnWidth + 1, cellHeight)
        }
      }
    }
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
