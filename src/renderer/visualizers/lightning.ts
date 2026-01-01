/**
 * Lightning Visualizer
 * Electric arcs that branch randomly - transparent bg, lower threshold for triggers
 */

export interface LightningOptions {
  container: HTMLElement
  colorScheme?: string
  maxBolts?: number
}

const colorSchemes: Record<string, { bolt: string, glow: string, flash: string }> = {
  classic: { bolt: '#00ff00', glow: '#00aa00', flash: '#aaffaa' },
  blue: { bolt: '#00ccff', glow: '#0066aa', flash: '#aaddff' },
  purple: { bolt: '#cc00ff', glow: '#6600aa', flash: '#ee88ff' },
  fire: { bolt: '#ffcc00', glow: '#ff6600', flash: '#ffffaa' },
  ice: { bolt: '#aaffff', glow: '#00aaff', flash: '#ffffff' },
  light: { bolt: '#ffffff', glow: '#aaaaaa', flash: '#ffffff' },
  dark: { bolt: '#5a7a9e', glow: '#3a5a7e', flash: '#8aaacc' },
  rainbow: { bolt: '#ffffff', glow: '#888888', flash: '#ffffff' }
}

interface LightningBolt {
  segments: { x1: number, y1: number, x2: number, y2: number }[]
  life: number
  maxLife: number
  hue: number
  brightness: number
}

export class LightningVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private maxBolts: number
  private bolts: LightningBolt[] = []
  private lastEnergy: number = 0
  private hue: number = 0
  private frameCount: number = 0

  constructor(options: LightningOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.maxBolts = options.maxBolts || 5

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
    this.bolts = []
    this.draw()
  }

  private createBolt(startX: number, startY: number, endX: number, endY: number): LightningBolt {
    const segments: { x1: number, y1: number, x2: number, y2: number }[] = []

    const generateSegments = (x1: number, y1: number, x2: number, y2: number, displacement: number, d: number): void => {
      if (displacement < 3 || d > 6) {
        segments.push({ x1, y1, x2, y2 })
        return
      }

      const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * displacement
      const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * displacement

      generateSegments(x1, y1, midX, midY, displacement / 2, d + 1)
      generateSegments(midX, midY, x2, y2, displacement / 2, d + 1)

      // Chance to create branch
      if (d < 4 && Math.random() < 0.5) {
        const branchAngle = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - 0.5) * Math.PI * 0.7
        const branchLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) * (0.3 + Math.random() * 0.3)
        const branchEndX = midX + Math.cos(branchAngle) * branchLength
        const branchEndY = midY + Math.sin(branchAngle) * branchLength

        generateSegments(midX, midY, branchEndX, branchEndY, displacement / 2.5, d + 1)
      }
    }

    const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
    generateSegments(startX, startY, endX, endY, distance / 2.5, 0)

    return {
      segments,
      life: 1,
      maxLife: 12 + Math.random() * 8,
      hue: this.hue,
      brightness: 0.8 + Math.random() * 0.2
    }
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Clear with transparent background
    this.ctx.clearRect(0, 0, width, height)

    // Calculate energy for transient detection
    let energy = 0
    for (let i = 0; i < Math.floor(this.dataArray.length * 0.3); i++) {
      energy += this.dataArray[i]
    }
    energy = energy / (this.dataArray.length * 0.3) / 255

    // Lower threshold for more frequent lightning
    const energyDelta = energy - this.lastEnergy
    this.frameCount++

    // Trigger on beat or periodically with lower threshold
    if ((energyDelta > 0.08 && energy > 0.2) || (energy > 0.3 && this.frameCount % 30 === 0)) {
      if (this.bolts.length < 8) {
        // Create lightning from random positions
        const startX = Math.random() * width
        const startY = 0
        const endX = startX + (Math.random() - 0.5) * width * 0.6
        const endY = height

        this.bolts.push(this.createBolt(startX, startY, endX, endY))

        // Sometimes add a second bolt
        if (energy > 0.4 && Math.random() < 0.5) {
          const startX2 = Math.random() * width
          const endX2 = startX2 + (Math.random() - 0.5) * width * 0.4
          this.bolts.push(this.createBolt(startX2, 0, endX2, height))
        }
      }
    }
    this.lastEnergy = energy * 0.6 + this.lastEnergy * 0.4

    // Draw and update bolts
    this.bolts = this.bolts.filter(bolt => {
      bolt.life -= 1 / bolt.maxLife
      if (bolt.life <= 0) return false

      const alpha = bolt.life * bolt.brightness
      const jitter = bolt.life > 0.7 ? 3 : 1 // Flicker at start

      // Draw segments
      for (const seg of bolt.segments) {
        const jx1 = (Math.random() - 0.5) * jitter
        const jy1 = (Math.random() - 0.5) * jitter
        const jx2 = (Math.random() - 0.5) * jitter
        const jy2 = (Math.random() - 0.5) * jitter

        // Wide outer glow
        this.ctx.beginPath()
        this.ctx.moveTo(seg.x1 + jx1, seg.y1 + jy1)
        this.ctx.lineTo(seg.x2 + jx2, seg.y2 + jy2)

        if (this.colorScheme === 'rainbow') {
          this.ctx.strokeStyle = `hsla(${bolt.hue}, 100%, 60%, ${alpha * 0.2})`
        } else {
          this.ctx.strokeStyle = scheme.glow
          this.ctx.globalAlpha = alpha * 0.2
        }
        this.ctx.lineWidth = 12
        this.ctx.lineCap = 'round'
        this.ctx.stroke()
        this.ctx.globalAlpha = 1

        // Medium glow
        this.ctx.beginPath()
        this.ctx.moveTo(seg.x1 + jx1, seg.y1 + jy1)
        this.ctx.lineTo(seg.x2 + jx2, seg.y2 + jy2)

        if (this.colorScheme === 'rainbow') {
          this.ctx.strokeStyle = `hsla(${bolt.hue}, 100%, 70%, ${alpha * 0.5})`
        } else {
          this.ctx.strokeStyle = scheme.bolt
          this.ctx.globalAlpha = alpha * 0.5
        }
        this.ctx.lineWidth = 5
        this.ctx.stroke()
        this.ctx.globalAlpha = 1

        // Bright core
        this.ctx.beginPath()
        this.ctx.moveTo(seg.x1 + jx1, seg.y1 + jy1)
        this.ctx.lineTo(seg.x2 + jx2, seg.y2 + jy2)

        if (this.colorScheme === 'rainbow') {
          this.ctx.strokeStyle = `hsla(${bolt.hue}, 50%, 95%, ${alpha})`
        } else {
          this.ctx.strokeStyle = scheme.flash
          this.ctx.globalAlpha = alpha
        }
        this.ctx.lineWidth = 2
        this.ctx.shadowBlur = 10
        this.ctx.shadowColor = this.colorScheme === 'rainbow'
          ? `hsl(${bolt.hue}, 100%, 60%)`
          : scheme.bolt
        this.ctx.stroke()

        this.ctx.globalAlpha = 1
        this.ctx.shadowBlur = 0
      }

      return true
    })

    this.hue = (this.hue + 2) % 360
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
