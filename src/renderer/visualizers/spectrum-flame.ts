/**
 * Spectrum Flame Visualizer
 * Flickering bars with random fire tendrils shooting from peaks
 */

export interface SpectrumFlameOptions {
  container: HTMLElement
  colorScheme?: string
  barCount?: number
}

const colorSchemes: Record<string, { base: string[], flame: string[] }> = {
  classic: { base: ['#004400', '#008800'], flame: ['#00ff00', '#88ff00', '#ffff00'] },
  blue: { base: ['#000044', '#000088'], flame: ['#0088ff', '#00ccff', '#ffffff'] },
  purple: { base: ['#220044', '#440088'], flame: ['#8800ff', '#cc00ff', '#ff88ff'] },
  fire: { base: ['#330000', '#660000'], flame: ['#ff0000', '#ff6600', '#ffcc00'] },
  ice: { base: ['#001133', '#002266'], flame: ['#0066ff', '#00ccff', '#ffffff'] },
  light: { base: ['#444444', '#666666'], flame: ['#aaaaaa', '#cccccc', '#ffffff'] },
  dark: { base: ['#0a1a2e', '#1a2a3e'], flame: ['#2a4a6e', '#3a5a7e', '#4a6a8e'] },
  rainbow: { base: ['#220022', '#442244'], flame: ['#ff0000', '#00ff00', '#0000ff'] }
}

interface Ember {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  color: string
}

export class SpectrumFlameVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private barCount: number
  private embers: Ember[] = []
  private flickerOffsets: number[] = []
  private hue: number = 0

  constructor(options: SpectrumFlameOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'fire'
    this.barCount = options.barCount || 64

    // Initialize flicker offsets
    for (let i = 0; i < this.barCount; i++) {
      this.flickerOffsets.push(Math.random() * Math.PI * 2)
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

  private spawnEmbers(x: number, energy: number, colors: string[]): void {
    const height = this.canvas.height / window.devicePixelRatio

    if (energy > 0.5 && Math.random() < energy * 0.3) {
      const emberCount = Math.floor(1 + energy * 2)
      for (let i = 0; i < emberCount; i++) {
        this.embers.push({
          x: x + (Math.random() - 0.5) * 10,
          y: height * (1 - energy),
          vx: (Math.random() - 0.5) * 3,
          vy: -(2 + Math.random() * 4 * energy),
          life: 1,
          size: 1 + Math.random() * 3,
          color: colors[Math.floor(Math.random() * colors.length)]
        })
      }
    }
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    this.ctx.clearRect(0, 0, width, height)

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.fire
    const barWidth = width / this.barCount
    const binSize = Math.floor(this.dataArray.length / this.barCount)
    const time = Date.now() / 1000

    // Draw bars with flame effect
    for (let i = 0; i < this.barCount; i++) {
      // Calculate average energy for this bar
      let sum = 0
      for (let j = 0; j < binSize; j++) {
        sum += this.dataArray[i * binSize + j]
      }
      const energy = sum / binSize / 255

      // Add flicker
      const flicker = Math.sin(time * 10 + this.flickerOffsets[i]) * 0.1 + 0.9
      const barHeight = energy * height * flicker

      const x = i * barWidth
      const y = height - barHeight

      // Create gradient for flame effect
      const gradient = this.ctx.createLinearGradient(x, height, x, y)

      if (this.colorScheme === 'rainbow') {
        const hue = (this.hue + i * 5) % 360
        gradient.addColorStop(0, `hsla(${hue}, 100%, 20%, 1)`)
        gradient.addColorStop(0.5, `hsla(${hue}, 100%, 50%, 1)`)
        gradient.addColorStop(1, `hsla(${(hue + 30) % 360}, 100%, 70%, 0.8)`)
      } else {
        gradient.addColorStop(0, scheme.base[0])
        gradient.addColorStop(0.3, scheme.base[1])
        gradient.addColorStop(0.6, scheme.flame[0])
        gradient.addColorStop(0.8, scheme.flame[1])
        gradient.addColorStop(1, scheme.flame[2])
      }

      this.ctx.fillStyle = gradient
      this.ctx.shadowBlur = 15
      this.ctx.shadowColor = scheme.flame[1]

      // Draw bar with slight taper at top
      this.ctx.beginPath()
      this.ctx.moveTo(x + 1, height)
      this.ctx.lineTo(x + barWidth - 1, height)
      this.ctx.lineTo(x + barWidth * 0.8, y)
      this.ctx.lineTo(x + barWidth * 0.2, y)
      this.ctx.closePath()
      this.ctx.fill()

      // Spawn embers from peaks
      this.spawnEmbers(x + barWidth / 2, energy, scheme.flame)
    }

    // Update and draw embers
    this.ctx.shadowBlur = 8
    this.embers = this.embers.filter(ember => {
      ember.x += ember.vx
      ember.y += ember.vy
      ember.vy -= 0.05 // Slight upward acceleration (heat rising)
      ember.vx += (Math.random() - 0.5) * 0.5 // Turbulence
      ember.life -= 0.02

      if (ember.life <= 0 || ember.y < -10) {
        return false
      }

      this.ctx.beginPath()
      this.ctx.arc(ember.x, ember.y, ember.size * ember.life, 0, Math.PI * 2)
      this.ctx.fillStyle = ember.color
      this.ctx.globalAlpha = ember.life
      this.ctx.shadowColor = ember.color
      this.ctx.fill()

      return true
    })

    this.ctx.globalAlpha = 1
    this.ctx.shadowBlur = 0
    this.hue = (this.hue + 1) % 360
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
