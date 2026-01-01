/**
 * Constellation Visualizer
 * Points connected by lines like star maps
 * Positions shift dramatically with frequency, connections pulse with amplitude
 */

export interface ConstellationOptions {
  container: HTMLElement
  colorScheme?: string
  starCount?: number
}

const colorSchemes: Record<string, { star: string, line: string, glow: string }> = {
  classic: { star: '#00ff00', line: '#00aa00', glow: '#00ff00' },
  blue: { star: '#00ccff', line: '#0088aa', glow: '#00ccff' },
  purple: { star: '#cc00ff', line: '#8800aa', glow: '#cc00ff' },
  fire: { star: '#ffcc00', line: '#ff8800', glow: '#ff6600' },
  ice: { star: '#ffffff', line: '#88ccff', glow: '#00ccff' },
  light: { star: '#ffffff', line: '#888888', glow: '#ffffff' },
  dark: { star: '#4a7a9e', line: '#2a4a6e', glow: '#4a7a9e' },
  rainbow: { star: '#ffffff', line: '#888888', glow: '#ffffff' }
}

interface Star {
  baseX: number
  baseY: number
  x: number
  y: number
  size: number
  freqBand: number
  phase: number
  orbitRadius: number
  orbitSpeed: number
}

export class ConstellationVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private stars: Star[] = []
  private starCount: number
  private connectionDistance: number = 150
  private hue: number = 0
  private time: number = 0

  constructor(options: ConstellationOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.starCount = options.starCount || 50

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private handleResize(): void {
    const parent = this.canvas.parentElement
    if (parent) {
      this.canvas.width = parent.offsetWidth * window.devicePixelRatio
      this.canvas.height = parent.offsetHeight * window.devicePixelRatio
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      this.connectionDistance = Math.max(parent.offsetWidth, parent.offsetHeight) * 0.15
      this.generateStars()
    }
  }

  private generateStars(): void {
    this.stars = []

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    for (let i = 0; i < this.starCount; i++) {
      const star: Star = {
        baseX: Math.random() * width,
        baseY: Math.random() * height,
        x: 0,
        y: 0,
        size: 1 + Math.random() * 3,
        freqBand: Math.floor(Math.random() * 16),
        phase: Math.random() * Math.PI * 2,
        orbitRadius: 20 + Math.random() * 40,
        orbitSpeed: 0.5 + Math.random() * 1.5
      }
      star.x = star.baseX
      star.y = star.baseY
      this.stars.push(star)
    }
  }

  init(analyser: AnalyserNode): void {
    this.analyser = analyser
    this.dataArray = new Uint8Array(analyser.frequencyBinCount)
    this.generateStars()
    this.draw()
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    this.ctx.clearRect(0, 0, width, height)

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Calculate overall and band energies
    let totalEnergy = 0
    for (let i = 0; i < this.dataArray.length; i++) {
      totalEnergy += this.dataArray[i]
    }
    const avgEnergy = totalEnergy / this.dataArray.length / 255

    const bandSize = Math.floor(this.dataArray.length / 16)
    const bandEnergies: number[] = []
    for (let b = 0; b < 16; b++) {
      let sum = 0
      for (let i = 0; i < bandSize; i++) {
        sum += this.dataArray[b * bandSize + i]
      }
      bandEnergies.push(sum / bandSize / 255)
    }

    // Update star positions with more dramatic movement
    this.stars.forEach(star => {
      const bandEnergy = bandEnergies[star.freqBand]

      // Orbital motion around base position
      const orbitX = Math.cos(this.time * star.orbitSpeed + star.phase) * star.orbitRadius * bandEnergy
      const orbitY = Math.sin(this.time * star.orbitSpeed + star.phase) * star.orbitRadius * bandEnergy

      // Additional wave motion based on energy
      const waveX = Math.sin(this.time * 2 + star.phase) * 30 * avgEnergy
      const waveY = Math.cos(this.time * 1.5 + star.phase * 2) * 30 * avgEnergy

      star.x = star.baseX + orbitX + waveX
      star.y = star.baseY + orbitY + waveY
    })

    // Draw connections
    this.ctx.lineWidth = 1

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i]

      for (let j = i + 1; j < this.stars.length; j++) {
        const other = this.stars[j]
        const dx = star.x - other.x
        const dy = star.y - other.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < this.connectionDistance) {
          const distFactor = 1 - dist / this.connectionDistance
          const combinedEnergy = (bandEnergies[star.freqBand] + bandEnergies[other.freqBand]) / 2
          const alpha = distFactor * (0.3 + combinedEnergy * 0.7)

          if (alpha > 0.1) {
            this.ctx.beginPath()
            this.ctx.moveTo(star.x, star.y)
            this.ctx.lineTo(other.x, other.y)

            if (this.colorScheme === 'rainbow') {
              this.ctx.strokeStyle = `hsla(${(this.hue + (i + j) * 5) % 360}, 80%, 60%, ${alpha})`
            } else {
              this.ctx.strokeStyle = scheme.line
              this.ctx.globalAlpha = alpha
            }

            this.ctx.lineWidth = 1 + combinedEnergy * 2
            this.ctx.stroke()
            this.ctx.globalAlpha = 1
          }
        }
      }
    }

    // Draw stars
    this.stars.forEach((star, i) => {
      const bandEnergy = bandEnergies[star.freqBand]
      const pulseSize = star.size * (1 + bandEnergy * 3)

      // Outer glow
      const glowRadius = pulseSize * 4 + bandEnergy * 10
      const gradient = this.ctx.createRadialGradient(
        star.x, star.y, 0,
        star.x, star.y, glowRadius
      )

      if (this.colorScheme === 'rainbow') {
        const hue = (this.hue + i * 10) % 360
        gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${0.5 + bandEnergy * 0.5})`)
        gradient.addColorStop(0.5, `hsla(${hue}, 100%, 50%, ${bandEnergy * 0.3})`)
        gradient.addColorStop(1, 'transparent')
      } else {
        gradient.addColorStop(0, scheme.glow)
        gradient.addColorStop(0.5, `${scheme.glow}44`)
        gradient.addColorStop(1, 'transparent')
      }

      this.ctx.beginPath()
      this.ctx.arc(star.x, star.y, glowRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = gradient
      if (this.colorScheme !== 'rainbow') {
        this.ctx.globalAlpha = 0.3 + bandEnergy * 0.5
      }
      this.ctx.fill()
      this.ctx.globalAlpha = 1

      // Star core
      this.ctx.beginPath()
      this.ctx.arc(star.x, star.y, pulseSize, 0, Math.PI * 2)

      if (this.colorScheme === 'rainbow') {
        this.ctx.fillStyle = `hsl(${(this.hue + i * 10) % 360}, 100%, ${70 + bandEnergy * 20}%)`
        this.ctx.shadowColor = `hsl(${(this.hue + i * 10) % 360}, 100%, 60%)`
      } else {
        this.ctx.fillStyle = scheme.star
        this.ctx.shadowColor = scheme.glow
      }

      this.ctx.shadowBlur = 10 + bandEnergy * 15
      this.ctx.fill()
    })

    this.ctx.shadowBlur = 0
    this.time += 0.02
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
