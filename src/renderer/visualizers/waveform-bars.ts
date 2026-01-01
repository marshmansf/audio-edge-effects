/**
 * Waveform Bars Visualizer
 * Vertical bars that extend up and down from center line
 */

export interface WaveformBarsOptions {
  container: HTMLElement
  barCount?: number
  colorScheme?: string
}

// Color schemes
const colorSchemes: Record<string, string> = {
  classic: '#00ff00',
  blue: '#00ccff',
  purple: '#cc00ff',
  fire: '#ff6600',
  ice: '#00ffff',
  light: '#ffffff',
  dark: '#0f3460',
  rainbow: '#ffffff' // Will use position-based coloring
}

export class WaveformBarsVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private barCount: number
  private colorScheme: string

  constructor(options: WaveformBarsOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.barCount = options.barCount || 64
    this.colorScheme = options.colorScheme || 'classic'

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

    const color = colorSchemes[this.colorScheme] || colorSchemes.classic
    const barGap = 2
    const barWidth = (width - (this.barCount - 1) * barGap) / this.barCount
    // Position baseline at bottom edge (like regular waveform)
    const baseline = height - 1
    const maxBarHeight = height * 3  // 3x magnitude

    // Sample waveform data for each bar
    const samplesPerBar = Math.floor(this.dataArray.length / this.barCount)

    for (let i = 0; i < this.barCount; i++) {
      // Get the waveform value for this bar position
      // Average samples for smoother appearance
      let sum = 0
      for (let j = 0; j < samplesPerBar; j++) {
        const sampleIndex = i * samplesPerBar + j
        // Convert from 0-255 (centered at 128) to -1 to 1
        sum += (this.dataArray[sampleIndex] - 128) / 128
      }
      const value = sum / samplesPerBar

      // Calculate bar height extending upward from baseline
      const barHeight = Math.abs(value) * maxBarHeight

      const x = i * (barWidth + barGap)

      // Set color
      if (this.colorScheme === 'rainbow') {
        // Rainbow based on position
        const hue = (i / this.barCount) * 360
        this.ctx.fillStyle = `hsl(${hue}, 100%, 70%)`
      } else {
        this.ctx.fillStyle = color
      }

      // Draw bar extending upward from baseline at bottom edge
      const topY = baseline - barHeight

      // Draw rounded rectangle from baseline upward
      this.drawRoundedRect(x, topY, barWidth, barHeight, Math.min(barWidth / 2, 3))
    }
  }

  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath()
    this.ctx.moveTo(x + radius, y)
    this.ctx.lineTo(x + width - radius, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    this.ctx.lineTo(x + width, y + height - radius)
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    this.ctx.lineTo(x + radius, y + height)
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    this.ctx.lineTo(x, y + radius)
    this.ctx.quadraticCurveTo(x, y, x + radius, y)
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
