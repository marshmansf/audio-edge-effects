/**
 * Spectrum Peaks Visualizer
 * Minimal floating peak dots with slow decay
 */

export interface SpectrumPeaksOptions {
  container: HTMLElement
  colorScheme?: string
  barCount?: number
}

const colorSchemes: Record<string, string> = {
  classic: '#00ff00',
  blue: '#00ccff',
  purple: '#cc00ff',
  fire: '#ff6600',
  ice: '#00ffff',
  light: '#ffffff',
  dark: '#4a7a9e',
  rainbow: '#ffffff'
}

interface Peak {
  height: number
  velocity: number
}

export class SpectrumPeaksVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private barCount: number
  private peaks: Peak[] = []
  private hue: number = 0
  private gravity: number = 0.15
  private peakHoldTime: number = 20

  constructor(options: SpectrumPeaksOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.barCount = options.barCount || 64

    // Initialize peaks
    for (let i = 0; i < this.barCount; i++) {
      this.peaks.push({ height: 0, velocity: 0 })
    }

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

    this.ctx.clearRect(0, 0, width, height)

    const barWidth = width / this.barCount
    const binSize = Math.floor(this.dataArray.length / this.barCount)
    const color = colorSchemes[this.colorScheme] || colorSchemes.classic

    for (let i = 0; i < this.barCount; i++) {
      // Calculate average energy for this bar
      let sum = 0
      for (let j = 0; j < binSize; j++) {
        sum += this.dataArray[i * binSize + j]
      }
      const energy = sum / binSize / 255
      const currentHeight = energy * height

      // Update peak
      if (currentHeight > this.peaks[i].height) {
        this.peaks[i].height = currentHeight
        this.peaks[i].velocity = 0
      } else {
        // Apply gravity to make peaks fall
        this.peaks[i].velocity += this.gravity
        this.peaks[i].height -= this.peaks[i].velocity

        if (this.peaks[i].height < 0) {
          this.peaks[i].height = 0
          this.peaks[i].velocity = 0
        }
      }

      const x = i * barWidth + barWidth / 2
      const peakY = height - this.peaks[i].height

      // Determine color
      let peakColor: string
      if (this.colorScheme === 'rainbow') {
        peakColor = `hsl(${(this.hue + i * 5) % 360}, 100%, 60%)`
      } else {
        peakColor = color
      }

      // Draw subtle bar ghost (very faint)
      if (energy > 0.05) {
        this.ctx.fillStyle = peakColor
        this.ctx.globalAlpha = 0.1
        this.ctx.fillRect(
          i * barWidth + 2,
          height - currentHeight,
          barWidth - 4,
          currentHeight
        )
      }

      // Draw peak dot
      if (this.peaks[i].height > 2) {
        const dotSize = 3 + (this.peaks[i].height / height) * 3

        this.ctx.beginPath()
        this.ctx.arc(x, peakY, dotSize, 0, Math.PI * 2)
        this.ctx.fillStyle = peakColor
        this.ctx.globalAlpha = 0.8 + (this.peaks[i].height / height) * 0.2
        this.ctx.shadowBlur = 15
        this.ctx.shadowColor = peakColor
        this.ctx.fill()

        // Draw connecting line below peak
        this.ctx.beginPath()
        this.ctx.moveTo(x, peakY + dotSize)
        this.ctx.lineTo(x, height)
        this.ctx.strokeStyle = peakColor
        this.ctx.globalAlpha = 0.15
        this.ctx.lineWidth = 1
        this.ctx.shadowBlur = 0
        this.ctx.stroke()
      }
    }

    this.ctx.globalAlpha = 1
    this.ctx.shadowBlur = 0
    this.hue = (this.hue + 0.5) % 360
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
