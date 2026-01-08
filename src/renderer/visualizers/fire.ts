/**
 * Fire Visualizer
 * Flame simulation with vertical stretching and audio reactivity
 */

import { AnimationController } from '../utils/animation-controller'

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
  private animationController: AnimationController | null = null
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
    this.animationController = new AnimationController(() => this.draw())
    this.animationController.start()
  }

  private spawnFlame(x: number, intensity: number, isEmber: boolean = false): void {
    const height = this.canvas.height / window.devicePixelRatio

    if (isEmber) {
      // Small ember particles
      this.particles.push({
        x,
        y: height - Math.random() * 20,
        vx: (Math.random() - 0.5) * 3,
        vy: -(3 + Math.random() * 5 * intensity),
        life: 1,
        maxLife: 20 + Math.random() * 30,
        size: 2 + Math.random() * 4,
        hue: this.hue + Math.random() * 20
      })
    } else {
      // Main flame particles - larger and more elongated
      this.particles.push({
        x,
        y: height,
        vx: (Math.random() - 0.5) * 2,
        vy: -(3 + Math.random() * 6 * intensity),
        life: 1,
        maxLife: 25 + Math.random() * 25 + intensity * 30,
        size: 20 + Math.random() * 35 * intensity,
        hue: this.hue + Math.random() * 30
      })
    }
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

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

    // Spawn flames based on audio - scaled by density (maxParticles)
    const densityFactor = this.maxParticles / 400 // normalize around 400 particles (density 100 * 4)
    const baseSpawnRate = (3 + bassEnergy * 20) * densityFactor
    const beatBonus = (bassEnergy > 0.4) ? 10 * densityFactor : 0
    const spawnRate = baseSpawnRate + beatBonus + midEnergy * 10 * densityFactor

    for (let i = 0; i < spawnRate && this.particles.length < this.maxParticles; i++) {
      const x = Math.random() * width
      this.spawnFlame(x, bassEnergy + midEnergy * 0.5, false)
    }

    // Spawn embers on strong beats, scaled by density
    if (bassEnergy > 0.3) {
      const emberCount = Math.floor(bassEnergy * 8 * densityFactor)
      for (let i = 0; i < emberCount && this.particles.length < this.maxParticles; i++) {
        const x = Math.random() * width
        this.spawnFlame(x, bassEnergy, true)
      }
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
      const isEmber = particle.size < 8

      if (isEmber) {
        // Draw ember as a small glowing dot
        this.ctx.save()
        this.ctx.beginPath()
        this.ctx.arc(particle.x, particle.y, particle.size * lifeRatio, 0, Math.PI * 2)

        if (this.colorScheme === 'rainbow') {
          this.ctx.fillStyle = `hsla(${particle.hue}, 100%, 70%, ${lifeRatio})`
          this.ctx.shadowColor = `hsl(${particle.hue}, 100%, 60%)`
        } else {
          this.ctx.fillStyle = scheme.ember
          this.ctx.shadowColor = scheme.ember
        }
        this.ctx.shadowBlur = 8
        this.ctx.globalAlpha = lifeRatio
        this.ctx.fill()
        this.ctx.restore()
      } else {
        // Flame size - narrow at top, wide at bottom, more elongated
        const flickerX = 1 + Math.sin(this.time * 10 + particle.x * 0.1) * 0.15
        const flickerY = 1 + Math.cos(this.time * 8 + particle.y * 0.1) * 0.1
        const sizeX = particle.size * lifeRatio * 0.5 * flickerX
        const sizeY = particle.size * lifeRatio * 2.2 * flickerY // Much taller flames

        // Draw flame shape - pointed at top
        this.ctx.save()
        this.ctx.translate(particle.x, particle.y)

        // Create gradient for flame
        const gradientSize = Math.max(sizeX, sizeY)
        const gradient = this.ctx.createRadialGradient(0, -sizeY * 0.3, 0, 0, 0, gradientSize)

        if (this.colorScheme === 'rainbow') {
          const hue = (particle.hue) % 360
          gradient.addColorStop(0, `hsla(${hue + 30}, 100%, 95%, ${lifeRatio * 0.95})`)
          gradient.addColorStop(0.2, `hsla(${hue + 15}, 100%, 70%, ${lifeRatio * 0.8})`)
          gradient.addColorStop(0.5, `hsla(${hue}, 100%, 50%, ${lifeRatio * 0.5})`)
          gradient.addColorStop(0.8, `hsla(${hue - 20}, 100%, 30%, ${lifeRatio * 0.2})`)
          gradient.addColorStop(1, 'transparent')
        } else {
          gradient.addColorStop(0, scheme.core[0])
          gradient.addColorStop(0.15, scheme.core[1] || scheme.core[0])
          if (scheme.core[2]) gradient.addColorStop(0.35, scheme.core[2])
          gradient.addColorStop(0.55, scheme.outer[0])
          gradient.addColorStop(0.8, scheme.outer[1])
          gradient.addColorStop(1, 'transparent')
        }

        // Draw flame as a teardrop/flame shape using bezier curves
        this.ctx.beginPath()
        this.ctx.moveTo(0, -sizeY) // Top point
        this.ctx.bezierCurveTo(
          sizeX * 0.8, -sizeY * 0.6,  // Control point 1
          sizeX * 1.2, sizeY * 0.2,   // Control point 2
          0, sizeY * 0.5              // End at bottom center
        )
        this.ctx.bezierCurveTo(
          -sizeX * 1.2, sizeY * 0.2,  // Control point 1
          -sizeX * 0.8, -sizeY * 0.6, // Control point 2
          0, -sizeY                    // Back to top
        )
        this.ctx.closePath()

        this.ctx.fillStyle = gradient
        if (this.colorScheme !== 'rainbow') {
          this.ctx.globalAlpha = lifeRatio * 0.85
        }
        this.ctx.fill()

        // Add inner bright core for flames that are still young
        if (lifeRatio > 0.4) {
          const coreGradient = this.ctx.createRadialGradient(0, -sizeY * 0.2, 0, 0, -sizeY * 0.2, sizeX * 0.6)
          if (this.colorScheme === 'rainbow') {
            coreGradient.addColorStop(0, `hsla(${particle.hue + 40}, 100%, 98%, ${lifeRatio})`)
          } else {
            coreGradient.addColorStop(0, scheme.core[0])
          }
          coreGradient.addColorStop(0.5, this.colorScheme === 'rainbow' ?
            `hsla(${particle.hue + 20}, 100%, 80%, ${lifeRatio * 0.5})` :
            (scheme.core[1] || scheme.core[0]))
          coreGradient.addColorStop(1, 'transparent')

          this.ctx.beginPath()
          this.ctx.ellipse(0, -sizeY * 0.3, sizeX * 0.5, sizeY * 0.4, 0, 0, Math.PI * 2)
          this.ctx.fillStyle = coreGradient
          this.ctx.globalAlpha = lifeRatio * 0.9
          this.ctx.fill()
        }

        this.ctx.restore()
      }

      this.ctx.globalAlpha = 1

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
    if (this.animationController) {
      this.animationController.destroy()
      this.animationController = null
    }
    this.canvas.remove()
    window.removeEventListener('resize', () => this.handleResize())
  }
}
