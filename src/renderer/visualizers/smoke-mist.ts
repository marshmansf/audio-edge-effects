/**
 * Smoke/Mist Visualizer
 * Wispy smoke tendrils that flow and react to frequency - transparent background
 */

export interface SmokeMistOptions {
  container: HTMLElement
  colorScheme?: string
  maxParticles?: number
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
  private maxParticles: number
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
    this.maxParticles = options.maxParticles || 150

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

  private spawnParticle(x: number, energy: number): void {
    const height = this.canvas.height / window.devicePixelRatio

    this.particles.push({
      x,
      y: height + 20,
      vx: (Math.random() - 0.5) * 2,
      vy: -(1.2 + Math.random() * 3 * energy), // Faster rise based on energy
      size: 50 + Math.random() * 60 + energy * 50, // Bigger particles
      life: 1,
      maxLife: 100 + Math.random() * 60,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
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

    // Spawn particles based on bass energy - more reactive
    const spawnRate = 1.5 + bassEnergy * 6
    const spawnCount = Math.floor(spawnRate)

    for (let i = 0; i < spawnCount; i++) {
      if (Math.random() < spawnRate - spawnCount + 1) {
        const x = Math.random() * width
        this.spawnParticle(x, bassEnergy)
      }
    }

    // Spawn extra particles on strong beats
    if (bassEnergy > 0.4) {
      const beatSpawns = Math.floor((bassEnergy - 0.3) * 8)
      for (let i = 0; i < beatSpawns; i++) {
        const x = Math.random() * width
        this.spawnParticle(x, bassEnergy * 1.3)
      }
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

      // Base alpha modulated by energy - more visible
      const baseAlpha = particle.life * (0.18 + bassEnergy * 0.2)

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

    // Apply edge fade - content fades to transparent towards inner edge
    this.ctx.globalCompositeOperation = 'destination-in'

    if (width > height * 2) {
      // Horizontal edge (top or bottom) - fade vertically, opaque at bottom (screen edge)
      const fadeGradient = this.ctx.createLinearGradient(0, 0, 0, height)
      fadeGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
      fadeGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)')
      fadeGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.6)')
      fadeGradient.addColorStop(1, 'rgba(255, 255, 255, 1)')
      this.ctx.fillStyle = fadeGradient
      this.ctx.fillRect(0, 0, width, height)
    } else if (height > width * 2) {
      // Vertical edge (left or right) - fade horizontally, opaque at right (screen edge)
      const fadeGradient = this.ctx.createLinearGradient(0, 0, width, 0)
      fadeGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
      fadeGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)')
      fadeGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.6)')
      fadeGradient.addColorStop(1, 'rgba(255, 255, 255, 1)')
      this.ctx.fillStyle = fadeGradient
      this.ctx.fillRect(0, 0, width, height)
    } else {
      // Square-ish - fade from center (transparent) to edges (opaque)
      const fadeGradient = this.ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.7
      )
      fadeGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
      fadeGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)')
      fadeGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.7)')
      fadeGradient.addColorStop(1, 'rgba(255, 255, 255, 1)')
      this.ctx.fillStyle = fadeGradient
      this.ctx.fillRect(0, 0, width, height)
    }

    this.ctx.globalCompositeOperation = 'source-over'

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
