/**
 * Smoke/Mist Visualizer
 * Wispy smoke tendrils that flow and react to frequency - transparent background
 */

export interface SmokeMistOptions {
  container: HTMLElement
  colorScheme?: string
}

const colorSchemes: Record<string, { smoke: string, highlight: string }> = {
  classic: { smoke: '#00ff00', highlight: '#88ff88' },
  blue: { smoke: '#00aaff', highlight: '#88ddff' },
  purple: { smoke: '#aa00ff', highlight: '#dd88ff' },
  fire: { smoke: '#ff6600', highlight: '#ffaa66' },
  ice: { smoke: '#88ddff', highlight: '#ffffff' },
  light: { smoke: '#aaaaaa', highlight: '#ffffff' },
  dark: { smoke: '#3a5a7e', highlight: '#5a7a9e' },
  rainbow: { smoke: '#888888', highlight: '#ffffff' }
}

interface SmokeParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  maxLife: number
  rotation: number
  rotationSpeed: number
  hue: number
}

export class SmokeMistVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private particles: SmokeParticle[] = []
  private time: number = 0
  private hue: number = 0

  constructor(options: SmokeMistOptions) {
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
    }
  }

  init(analyser: AnalyserNode): void {
    this.analyser = analyser
    this.dataArray = new Uint8Array(analyser.frequencyBinCount)
    this.particles = []
    this.draw()
  }

  private spawnParticle(x: number, energy: number): void {
    const height = this.canvas.height / window.devicePixelRatio

    this.particles.push({
      x,
      y: height + 20,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(0.8 + Math.random() * 2 * energy),
      size: 40 + Math.random() * 50 + energy * 30,
      life: 1,
      maxLife: 120 + Math.random() * 80,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.015,
      hue: this.hue + Math.random() * 60
    })
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

    // Calculate frequency energies
    const bassEnd = Math.floor(this.dataArray.length * 0.15)
    const midEnd = Math.floor(this.dataArray.length * 0.5)

    let bassEnergy = 0
    for (let i = 0; i < bassEnd; i++) {
      bassEnergy += this.dataArray[i]
    }
    bassEnergy = bassEnergy / bassEnd / 255

    let midEnergy = 0
    for (let i = bassEnd; i < midEnd; i++) {
      midEnergy += this.dataArray[i]
    }
    midEnergy = midEnergy / (midEnd - bassEnd) / 255

    let highEnergy = 0
    for (let i = midEnd; i < this.dataArray.length; i++) {
      highEnergy += this.dataArray[i]
    }
    highEnergy = highEnergy / (this.dataArray.length - midEnd) / 255

    // Spawn particles based on bass energy
    const spawnRate = 0.8 + bassEnergy * 3
    if (Math.random() < spawnRate) {
      const x = Math.random() * width
      this.spawnParticle(x, bassEnergy)
    }

    // Wind from mid frequencies
    const windStrength = Math.sin(this.time * 0.3) * midEnergy * 2

    // Update and draw particles
    this.particles = this.particles.filter(particle => {
      particle.life -= 1 / particle.maxLife
      if (particle.life <= 0) return false

      // Apply drift and turbulence
      particle.vx += windStrength * 0.02 + (Math.random() - 0.5) * 0.08
      particle.vy -= 0.01 + highEnergy * 0.02 // Slight upward drift, more with treble

      // Damping
      particle.vx *= 0.985
      particle.vy *= 0.99

      particle.x += particle.vx
      particle.y += particle.vy
      particle.rotation += particle.rotationSpeed

      // Expand as it rises
      const expandedSize = particle.size * (1 + (1 - particle.life) * 2.5)

      // Draw smoke puff
      this.ctx.save()
      this.ctx.translate(particle.x, particle.y)
      this.ctx.rotate(particle.rotation)

      // Base alpha modulated by energy
      const baseAlpha = particle.life * (0.12 + bassEnergy * 0.1)

      // Draw multiple overlapping circles for cloud effect
      const cloudPoints = 6
      for (let i = 0; i < cloudPoints; i++) {
        const offsetAngle = (i / cloudPoints) * Math.PI * 2
        const offsetDist = expandedSize * 0.3
        const offsetX = Math.cos(offsetAngle + particle.rotation * 0.5) * offsetDist
        const offsetY = Math.sin(offsetAngle + particle.rotation * 0.5) * offsetDist
        const subSize = expandedSize * (0.5 + Math.random() * 0.2)

        const gradient = this.ctx.createRadialGradient(offsetX, offsetY, 0, offsetX, offsetY, subSize)

        if (this.colorScheme === 'rainbow') {
          const hue = (particle.hue + i * 10) % 360
          gradient.addColorStop(0, `hsla(${hue}, 60%, 60%, ${baseAlpha})`)
          gradient.addColorStop(0.5, `hsla(${hue}, 50%, 50%, ${baseAlpha * 0.5})`)
          gradient.addColorStop(1, 'transparent')
        } else {
          gradient.addColorStop(0, scheme.smoke)
          gradient.addColorStop(0.5, scheme.smoke)
          gradient.addColorStop(1, 'transparent')
        }

        this.ctx.beginPath()
        this.ctx.arc(offsetX, offsetY, subSize, 0, Math.PI * 2)
        this.ctx.fillStyle = gradient
        if (this.colorScheme !== 'rainbow') {
          this.ctx.globalAlpha = baseAlpha
        }
        this.ctx.fill()
      }

      this.ctx.restore()
      this.ctx.globalAlpha = 1

      return true
    })

    this.time += 0.02
    this.hue = (this.hue + 0.2) % 360
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
