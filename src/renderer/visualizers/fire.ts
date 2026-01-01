/**
 * Fire Visualizer
 * Flame simulation with vertical stretching and audio reactivity
 */

export interface FireOptions {
  container: HTMLElement
  colorScheme?: string
  maxParticles?: number
}

const colorSchemes: Record<string, { core: string[], outer: string[], ember: string }> = {
  classic: { core: ['#88ff00', '#00ff00'], outer: ['#004400', '#001100'], ember: '#88ff00' },
  blue: { core: ['#ffffff', '#00aaff'], outer: ['#004488', '#001122'], ember: '#00ccff' },
  purple: { core: ['#ffaaff', '#aa00ff'], outer: ['#440066', '#110022'], ember: '#ff00ff' },
  fire: { core: ['#ffffff', '#ffcc00', '#ff6600'], outer: ['#ff3300', '#660000'], ember: '#ffaa00' },
  ice: { core: ['#ffffff', '#aaffff'], outer: ['#0088aa', '#002233'], ember: '#00ffff' },
  light: { core: ['#ffffff', '#eeeeee'], outer: ['#888888', '#333333'], ember: '#ffffff' },
  dark: { core: ['#6a9abe', '#4a7a9e'], outer: ['#2a4a6e', '#0a1a2e'], ember: '#4a7a9e' },
  rainbow: { core: ['#ffffff', '#ffcc00'], outer: ['#ff6600', '#330000'], ember: '#ffaa00' }
}

interface FlameParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  hue: number
}

export class FireVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private maxParticles: number
  private particles: FlameParticle[] = []
  private hue: number = 0
  private time: number = 0

  constructor(options: FireOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'fire'
    this.maxParticles = options.maxParticles || 200

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
    this.particles = []
    this.draw()
  }

  private spawnFlame(x: number, intensity: number): void {
    const height = this.canvas.height / window.devicePixelRatio

    this.particles.push({
      x,
      y: height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(2 + Math.random() * 4 * intensity),
      life: 1,
      maxLife: 30 + Math.random() * 30 + intensity * 20,
      size: 15 + Math.random() * 25 * intensity,
      hue: this.hue + Math.random() * 30
    })
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.fire

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height)

    // Calculate bass and mid energy
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

    // Spawn flames based on audio
    const spawnRate = 5 + bassEnergy * 15
    for (let i = 0; i < spawnRate; i++) {
      const x = Math.random() * width
      this.spawnFlame(x, bassEnergy)
    }

    // Wind effect
    const wind = Math.sin(this.time * 0.5) * midEnergy * 1.5

    // Sort particles by life for proper layering
    this.particles.sort((a, b) => b.life - a.life)

    // Update and draw flames
    this.particles = this.particles.filter(particle => {
      particle.life -= 1 / particle.maxLife
      if (particle.life <= 0) return false

      // Apply forces
      particle.vx += wind * 0.05 + (Math.random() - 0.5) * 0.2
      particle.vy -= 0.08 // Buoyancy

      // Damping
      particle.vx *= 0.98

      particle.x += particle.vx
      particle.y += particle.vy

      const lifeRatio = particle.life

      // Flame size - narrow at top, wide at bottom
      const sizeX = particle.size * lifeRatio * 0.6
      const sizeY = particle.size * lifeRatio * 1.5 // Taller flames

      // Draw flame shape (elliptical, stretched vertically)
      this.ctx.save()
      this.ctx.translate(particle.x, particle.y)

      // Create gradient for flame
      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(sizeX, sizeY))

      if (this.colorScheme === 'rainbow') {
        const hue = (particle.hue) % 360
        gradient.addColorStop(0, `hsla(${hue + 30}, 100%, 90%, ${lifeRatio * 0.9})`)
        gradient.addColorStop(0.3, `hsla(${hue}, 100%, 60%, ${lifeRatio * 0.7})`)
        gradient.addColorStop(0.6, `hsla(${hue - 20}, 100%, 40%, ${lifeRatio * 0.4})`)
        gradient.addColorStop(1, 'transparent')
      } else {
        gradient.addColorStop(0, scheme.core[0])
        gradient.addColorStop(0.2, scheme.core[1] || scheme.core[0])
        if (scheme.core[2]) gradient.addColorStop(0.4, scheme.core[2])
        gradient.addColorStop(0.6, scheme.outer[0])
        gradient.addColorStop(1, 'transparent')
      }

      // Draw elliptical flame
      this.ctx.beginPath()
      this.ctx.ellipse(0, 0, sizeX, sizeY, 0, 0, Math.PI * 2)

      this.ctx.fillStyle = gradient
      if (this.colorScheme !== 'rainbow') {
        this.ctx.globalAlpha = lifeRatio * 0.8
      }
      this.ctx.fill()

      // Add inner bright core
      if (lifeRatio > 0.5) {
        const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, sizeX * 0.5)
        if (this.colorScheme === 'rainbow') {
          coreGradient.addColorStop(0, `hsla(${particle.hue + 40}, 100%, 95%, ${lifeRatio})`)
        } else {
          coreGradient.addColorStop(0, scheme.core[0])
        }
        coreGradient.addColorStop(1, 'transparent')

        this.ctx.beginPath()
        this.ctx.ellipse(0, -sizeY * 0.2, sizeX * 0.4, sizeY * 0.5, 0, 0, Math.PI * 2)
        this.ctx.fillStyle = coreGradient
        this.ctx.globalAlpha = lifeRatio
        this.ctx.fill()
      }

      this.ctx.restore()
      this.ctx.globalAlpha = 1

      // Spawn embers occasionally
      if (Math.random() < 0.02 * bassEnergy && lifeRatio > 0.3) {
        this.particles.push({
          x: particle.x + (Math.random() - 0.5) * sizeX,
          y: particle.y,
          vx: (Math.random() - 0.5) * 2 + wind,
          vy: -1 - Math.random() * 2,
          life: 1,
          maxLife: 40 + Math.random() * 30,
          size: 2 + Math.random() * 3,
          hue: particle.hue
        })
      }

      return true
    })

    this.time += 0.05
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
