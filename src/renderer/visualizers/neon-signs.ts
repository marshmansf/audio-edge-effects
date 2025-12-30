/**
 * Neon Signs Visualizer
 * Glowing tube-style lines that flicker slightly
 */

export interface NeonSignsOptions {
  container: HTMLElement
  colorScheme?: string
}

const colorSchemes: Record<string, string[]> = {
  classic: ['#00ff00', '#88ff00', '#ffff00'],
  blue: ['#0066ff', '#00aaff', '#00eeff'],
  purple: ['#8800ff', '#cc00ff', '#ff00ff'],
  fire: ['#ff0000', '#ff6600', '#ffcc00'],
  ice: ['#0088ff', '#00ccff', '#aaffff'],
  light: ['#ffffff', '#ffeecc', '#ffeeff'],
  dark: ['#3a5a7e', '#4a7a9e', '#5a9abe'],
  rainbow: ['#ff0000', '#00ff00', '#0000ff']
}

interface NeonTube {
  points: { x: number, y: number }[]
  color: string
  flickerPhase: number
  flickerSpeed: number
  freqBand: number
}

export class NeonSignsVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private tubes: NeonTube[] = []
  private hue: number = 0
  private time: number = 0

  constructor(options: NeonSignsOptions) {
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
      this.generateTubes()
    }
  }

  private generateTubes(): void {
    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio
    const colors = colorSchemes[this.colorScheme] || colorSchemes.classic

    this.tubes = []

    // Create wave tubes at different heights
    const tubeCount = 5

    for (let t = 0; t < tubeCount; t++) {
      const baseY = height * (0.2 + (t / tubeCount) * 0.6)
      const points: { x: number, y: number }[] = []

      // Generate wavy path
      const segments = 30
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * width
        const phase = t * 0.5
        const amplitude = height * 0.1
        const y = baseY + Math.sin((i / segments) * Math.PI * 3 + phase) * amplitude

        points.push({ x, y })
      }

      this.tubes.push({
        points,
        color: colors[t % colors.length],
        flickerPhase: Math.random() * Math.PI * 2,
        flickerSpeed: 0.1 + Math.random() * 0.2,
        freqBand: t
      })
    }
  }

  init(analyser: AnalyserNode): void {
    this.analyser = analyser
    this.dataArray = new Uint8Array(analyser.frequencyBinCount)
    this.generateTubes()
    this.draw()
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear with transparent background
    this.ctx.clearRect(0, 0, width, height)

    // Calculate energy per band
    const bandSize = Math.floor(this.dataArray.length / this.tubes.length)
    const energies: number[] = []

    for (let i = 0; i < this.tubes.length; i++) {
      let sum = 0
      for (let j = 0; j < bandSize; j++) {
        sum += this.dataArray[i * bandSize + j]
      }
      energies.push(sum / bandSize / 255)
    }

    // Draw each neon tube
    for (let t = 0; t < this.tubes.length; t++) {
      const tube = this.tubes[t]
      const energy = energies[tube.freqBand]

      // Flicker effect - more dramatic based on energy
      const flicker = 0.6 + Math.sin(this.time * tube.flickerSpeed * 50 + tube.flickerPhase) * 0.2
      const randomFlicker = Math.random() > (0.95 - energy * 0.1) ? 0.4 : 1 // More flickering with energy

      const brightness = flicker * randomFlicker * (0.4 + energy * 0.6)

      // Update points based on audio - more dramatic movement
      const points = tube.points.map((p, i) => ({
        x: p.x + Math.sin(this.time * 3 + i * 0.5) * energy * 8,
        y: p.y + Math.sin(this.time * 2 + i * 0.3) * energy * 20 + Math.cos(this.time + i * 0.2) * energy * 10
      }))

      // Draw glow layers - more intense with energy
      const glowIntensity = 1 + energy * 1.5
      const glowLayers = [
        { blur: 35 * glowIntensity, width: 18 * glowIntensity, alpha: 0.2 },
        { blur: 20 * glowIntensity, width: 12 * glowIntensity, alpha: 0.35 },
        { blur: 10 * glowIntensity, width: 7, alpha: 0.55 },
        { blur: 4, width: 4, alpha: 0.85 },
        { blur: 0, width: 2, alpha: 1 }
      ]

      for (const layer of glowLayers) {
        this.ctx.beginPath()

        for (let i = 0; i < points.length; i++) {
          if (i === 0) {
            this.ctx.moveTo(points[i].x, points[i].y)
          } else {
            // Smooth curve
            const prev = points[i - 1]
            const cpX = (prev.x + points[i].x) / 2
            this.ctx.quadraticCurveTo(prev.x, prev.y, cpX, (prev.y + points[i].y) / 2)
          }
        }

        // Color based on scheme
        if (this.colorScheme === 'rainbow') {
          this.ctx.strokeStyle = `hsla(${(this.hue + t * 60) % 360}, 100%, 60%, ${layer.alpha * brightness})`
          this.ctx.shadowColor = `hsl(${(this.hue + t * 60) % 360}, 100%, 60%)`
        } else {
          this.ctx.strokeStyle = tube.color
          this.ctx.shadowColor = tube.color
          this.ctx.globalAlpha = layer.alpha * brightness
        }

        this.ctx.lineWidth = layer.width * (0.8 + energy * 0.4)
        this.ctx.shadowBlur = layer.blur
        this.ctx.lineCap = 'round'
        this.ctx.lineJoin = 'round'
        this.ctx.stroke()
      }

      this.ctx.globalAlpha = 1
      this.ctx.shadowBlur = 0

      // Draw tube end caps - pulse with audio
      const endRadius = 5 + energy * 8
      const endColor = this.colorScheme === 'rainbow'
        ? `hsl(${(this.hue + t * 60) % 360}, 100%, 80%)`
        : tube.color

      // Start cap
      this.ctx.beginPath()
      this.ctx.arc(points[0].x, points[0].y, endRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = endColor
      this.ctx.shadowBlur = 15
      this.ctx.shadowColor = endColor
      this.ctx.fill()

      // End cap
      this.ctx.beginPath()
      this.ctx.arc(points[points.length - 1].x, points[points.length - 1].y, endRadius, 0, Math.PI * 2)
      this.ctx.fill()

      this.ctx.shadowBlur = 0
    }

    this.time += 0.016
    this.hue = (this.hue + 0.3) % 360
  }

  setColorScheme(scheme: string): void {
    if (colorSchemes[scheme]) {
      this.colorScheme = scheme
      this.generateTubes()
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
