/**
 * Spectrum Bars Visualizer
 * Simple solid rounded bars for spectrum display
 */

export interface SpectrumBarsOptions {
  container: HTMLElement
  barCount?: number
  colorScheme?: string
}

// Color schemes - solid colors with optional gradient
const colorSchemes: Record<string, { bottom: string, top: string }> = {
  classic: { bottom: '#00ff00', top: '#88ff00' },
  blue: { bottom: '#0066ff', top: '#00ccff' },
  purple: { bottom: '#6600ff', top: '#cc00ff' },
  fire: { bottom: '#ff3300', top: '#ffcc00' },
  ice: { bottom: '#0099ff', top: '#ffffff' },
  light: { bottom: '#cccccc', top: '#ffffff' },
  dark: { bottom: '#1a1a2e', top: '#0f3460' },
  rainbow: { bottom: '#00ff00', top: '#ffff00' } // Will use position-based rainbow
}

export class SpectrumBarsVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private barCount: number
  private colorScheme: string
  private smoothedData: number[] = []

  constructor(options: SpectrumBarsOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.barCount = options.barCount || 48
    this.colorScheme = options.colorScheme || 'classic'
    this.smoothedData = new Array(this.barCount).fill(0)

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

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height)

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic
    const barGap = 3
    const barWidth = (width - (this.barCount - 1) * barGap) / this.barCount
    const cornerRadius = Math.min(barWidth / 2, 4)

    // Sample frequency data for each bar (use logarithmic distribution for better bass representation)
    const binSize = Math.floor(this.dataArray.length / this.barCount)

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
      const barHeight = Math.max(2, value * height)

      const x = i * (barWidth + barGap)
      const y = height - barHeight

      // Create gradient for the bar
      let gradient: CanvasGradient
      if (this.colorScheme === 'rainbow') {
        // Rainbow - color based on position
        const hue = (i / this.barCount) * 120 // Green to yellow range
        gradient = this.ctx.createLinearGradient(x, height, x, y)
        gradient.addColorStop(0, `hsl(${hue}, 100%, 50%)`)
        gradient.addColorStop(1, `hsl(${hue + 30}, 100%, 60%)`)
      } else {
        gradient = this.ctx.createLinearGradient(x, height, x, y)
        gradient.addColorStop(0, scheme.bottom)
        gradient.addColorStop(1, scheme.top)
      }

      this.ctx.fillStyle = gradient

      // Draw rounded rectangle
      this.drawRoundedRect(x, y, barWidth, barHeight, cornerRadius)
    }
  }

  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    // Only round the top corners
    this.ctx.beginPath()
    this.ctx.moveTo(x, y + height)
    this.ctx.lineTo(x, y + radius)
    this.ctx.quadraticCurveTo(x, y, x + radius, y)
    this.ctx.lineTo(x + width - radius, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    this.ctx.lineTo(x + width, y + height)
    this.ctx.closePath()
    this.ctx.fill()
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
