/**
 * Gravity Wells Visualizer
 * Particles orbit around bass-activated gravity points
 * Transparent background with more dramatic audio reactivity
 */

import { AnimationController } from '../utils/animation-controller'

export interface GravityWellsOptions {
  container: HTMLElement
  colorScheme?: string
  maxParticles?: number
}

const colorSchemes: Record<string, { particle: string, well: string, trail: string }> = {
  classic: { particle: '#00ff00', well: '#00aa00', trail: '#00ff00' },
  blue: { particle: '#00ccff', well: '#0088cc', trail: '#00ccff' },
  purple: { particle: '#cc00ff', well: '#8800aa', trail: '#cc00ff' },
  fire: { particle: '#ffcc00', well: '#ff8800', trail: '#ffcc00' },
  ice: { particle: '#ffffff', well: '#88ccff', trail: '#00ccff' },
  light: { particle: '#ffffff', well: '#aaaaaa', trail: '#ffffff' },
  dark: { particle: '#5a7a9e', well: '#3a5a7e', trail: '#5a7a9e' },
  rainbow: { particle: '#ffffff', well: '#888888', trail: '#ffffff' }
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  brightness: number
  hue: number
  size: number
  prevX: number  // Only store previous position for simple trail
  prevY: number
}

interface GravityWell {
  x: number
  y: number
  strength: number
  targetStrength: number
  hue: number
  pulsePhase: number
}

export class GravityWellsVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationController: AnimationController | null = null
  private colorScheme: string
  private particles: Particle[] = []
  private wells: GravityWell[] = []
  private maxParticles: number
  private hue: number = 0
  private time: number = 0

  constructor(options: GravityWellsOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    // Cap at 500 particles for performance - higher values cause slowdown
    this.maxParticles = Math.min(options.maxParticles || 300, 500)

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private handleResize(): void {
    const parent = this.canvas.parentElement
    if (parent) {
      this.canvas.width = parent.offsetWidth * window.devicePixelRatio
      this.canvas.height = parent.offsetHeight * window.devicePixelRatio
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      this.initWells()
    }
  }

  private initWells(): void {
    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    this.wells = []
    const wellCount = 4

    for (let i = 0; i < wellCount; i++) {
      this.wells.push({
        x: width * (0.15 + (i / (wellCount - 1)) * 0.7),
        y: height * 0.5,
        strength: 0,
        targetStrength: 0,
        hue: (360 / wellCount) * i,
        pulsePhase: Math.random() * Math.PI * 2
      })
    }
  }

  init(analyser: AnalyserNode): void {
    this.analyser = analyser
    this.dataArray = new Uint8Array(analyser.frequencyBinCount)
    this.initWells()
    this.particles = []

    // Spawn initial particles
    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio
    for (let i = 0; i < 100; i++) {
      this.spawnParticle(width, height)
    }

    this.animationController = new AnimationController(() => this.draw())
    this.animationController.start()
  }

  private spawnParticle(width: number, height: number): void {
    // Spawn around wells
    const wellIndex = Math.floor(Math.random() * this.wells.length)
    const well = this.wells[wellIndex]
    const angle = Math.random() * Math.PI * 2
    const dist = 50 + Math.random() * 100
    const x = well.x + Math.cos(angle) * dist
    const y = well.y + Math.sin(angle) * dist

    this.particles.push({
      x,
      y,
      vx: Math.sin(angle) * 2,
      vy: -Math.cos(angle) * 2,
      brightness: 0.5 + Math.random() * 0.5,
      hue: Math.random() * 360,
      size: 1 + Math.random() * 2,
      prevX: x,
      prevY: y
    })
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear with transparency
    this.ctx.clearRect(0, 0, width, height)

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Calculate bass, mid, and treble energy
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

    let trebleEnergy = 0
    for (let i = midEnd; i < this.dataArray.length; i++) {
      trebleEnergy += this.dataArray[i]
    }
    trebleEnergy = trebleEnergy / (this.dataArray.length - midEnd) / 255

    // Update well strengths based on frequency bands
    const bandSize = Math.floor(bassEnd / this.wells.length)
    for (let i = 0; i < this.wells.length; i++) {
      let wellEnergy = 0
      for (let j = 0; j < bandSize; j++) {
        wellEnergy += this.dataArray[i * bandSize + j]
      }
      wellEnergy = wellEnergy / bandSize / 255

      this.wells[i].targetStrength = wellEnergy * 800
      this.wells[i].strength += (this.wells[i].targetStrength - this.wells[i].strength) * 0.15
      this.wells[i].pulsePhase += 0.05 + wellEnergy * 0.1
    }

    // Spawn particles based on energy
    while (this.particles.length < this.maxParticles * (0.3 + bassEnergy * 0.7)) {
      this.spawnParticle(width, height)
    }

    // Draw gravity wells
    for (const well of this.wells) {
      const pulseScale = 1 + Math.sin(well.pulsePhase) * 0.2 * (well.strength / 400)
      const wellRadius = (well.strength / 15) * pulseScale

      if (wellRadius > 2) {
        // Outer glow
        const gradient = this.ctx.createRadialGradient(
          well.x, well.y, 0,
          well.x, well.y, wellRadius * 2
        )

        if (this.colorScheme === 'rainbow') {
          gradient.addColorStop(0, `hsla(${well.hue}, 100%, 60%, ${0.4 + bassEnergy * 0.3})`)
          gradient.addColorStop(0.5, `hsla(${well.hue}, 100%, 50%, 0.2)`)
          gradient.addColorStop(1, 'transparent')
        } else {
          gradient.addColorStop(0, scheme.well)
          gradient.addColorStop(0.5, `${scheme.well}44`)
          gradient.addColorStop(1, 'transparent')
        }

        this.ctx.beginPath()
        this.ctx.arc(well.x, well.y, wellRadius * 2, 0, Math.PI * 2)
        this.ctx.fillStyle = gradient
        this.ctx.fill()

        // Core
        this.ctx.beginPath()
        this.ctx.arc(well.x, well.y, wellRadius * 0.3, 0, Math.PI * 2)
        if (this.colorScheme === 'rainbow') {
          this.ctx.fillStyle = `hsl(${well.hue}, 100%, 70%)`
          this.ctx.shadowColor = `hsl(${well.hue}, 100%, 60%)`
        } else {
          this.ctx.fillStyle = scheme.well
          this.ctx.shadowColor = scheme.well
        }
        this.ctx.shadowBlur = 15
        this.ctx.fill()
        this.ctx.shadowBlur = 0
      }
    }

    // Update particles (physics only, no drawing yet)
    const particleCount = this.particles.length
    const maxSpeed = 10
    const driftScale = midEnergy * 0.3

    for (const particle of this.particles) {
      // Store previous position for trail
      particle.prevX = particle.x
      particle.prevY = particle.y

      // Apply gravity from wells
      for (const well of this.wells) {
        if (well.strength < 20) continue

        const dx = well.x - particle.x
        const dy = well.y - particle.y
        const distSq = dx * dx + dy * dy

        if (distSq > 100 && distSq < 90000) { // 10^2 to 300^2
          const dist = Math.sqrt(distSq)
          const force = (well.strength / distSq) * 0.03
          particle.vx += (dx / dist) * force
          particle.vy += (dy / dist) * force
        }
      }

      // Apply drift based on mid frequency
      particle.vx += (Math.random() - 0.5) * driftScale
      particle.vy += (Math.random() - 0.5) * driftScale

      // Limit velocity
      const speedSq = particle.vx * particle.vx + particle.vy * particle.vy
      if (speedSq > maxSpeed * maxSpeed) {
        const speed = Math.sqrt(speedSq)
        particle.vx = (particle.vx / speed) * maxSpeed
        particle.vy = (particle.vy / speed) * maxSpeed
      }

      // Update position
      particle.x += particle.vx
      particle.y += particle.vy

      // Wrap around edges
      if (particle.x < -50) particle.x = width + 50
      else if (particle.x > width + 50) particle.x = -50
      if (particle.y < -50) particle.y = height + 50
      else if (particle.y > height + 50) particle.y = -50

      // Update brightness and hue
      particle.brightness = 0.4 + trebleEnergy * 0.6
      particle.hue = (particle.hue + 0.5) % 360
    }

    // Draw all trails in one batch (much faster than individual strokes)
    if (particleCount < 400) {
      this.ctx.lineWidth = 1.5
      this.ctx.lineCap = 'round'

      if (this.colorScheme === 'rainbow') {
        // For rainbow, group by hue ranges to reduce color changes
        for (const particle of this.particles) {
          this.ctx.beginPath()
          this.ctx.moveTo(particle.prevX, particle.prevY)
          this.ctx.lineTo(particle.x, particle.y)
          this.ctx.strokeStyle = `hsla(${Math.round(particle.hue / 30) * 30}, 80%, 60%, ${particle.brightness * 0.5})`
          this.ctx.stroke()
        }
      } else {
        // For solid colors, batch all trails together
        this.ctx.strokeStyle = scheme.trail
        this.ctx.globalAlpha = 0.4
        this.ctx.beginPath()
        for (const particle of this.particles) {
          this.ctx.moveTo(particle.prevX, particle.prevY)
          this.ctx.lineTo(particle.x, particle.y)
        }
        this.ctx.stroke()
        this.ctx.globalAlpha = 1
      }
    }

    // Draw all particles - batch by color when possible
    const particleSize = 2 * (1 + bassEnergy)

    if (this.colorScheme === 'rainbow') {
      // Rainbow needs individual colors but skip glow for performance
      for (const particle of this.particles) {
        this.ctx.beginPath()
        this.ctx.arc(particle.x, particle.y, particle.size * (1 + bassEnergy * 0.5), 0, Math.PI * 2)
        this.ctx.fillStyle = `hsl(${Math.round(particle.hue)}, 100%, ${60 + particle.brightness * 30}%)`
        this.ctx.fill()
      }
    } else {
      // Solid color - draw all particles with same color
      this.ctx.fillStyle = scheme.particle

      // Only add glow effect for small particle counts (expensive operation)
      if (particleCount < 150) {
        this.ctx.shadowColor = scheme.particle
        this.ctx.shadowBlur = 8
      }

      for (const particle of this.particles) {
        this.ctx.beginPath()
        this.ctx.arc(particle.x, particle.y, particle.size * (1 + bassEnergy * 0.5), 0, Math.PI * 2)
        this.ctx.fill()
      }

      this.ctx.shadowBlur = 0
    }
    this.hue = (this.hue + 0.3) % 360
    this.time += 0.02
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
