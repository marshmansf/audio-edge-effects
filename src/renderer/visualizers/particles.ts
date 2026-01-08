/**
 * Particle Fountain Visualizer
 * Particles erupting from baseline, driven by frequency
 * Gravity pulls them back, color based on frequency band
 */

import { AnimationController } from '../utils/animation-controller'

export interface ParticlesOptions {
  container: HTMLElement
  colorScheme?: string
  maxParticles?: number
}

// Color schemes - bass=warm, highs=cool
const colorSchemes: Record<string, { bass: string, mid: string, high: string }> = {
  classic: { bass: '#00ff00', mid: '#88ff00', high: '#ffff00' },
  blue: { bass: '#0044ff', mid: '#0088ff', high: '#00ccff' },
  purple: { bass: '#6600ff', mid: '#aa00ff', high: '#ff00ff' },
  fire: { bass: '#ff0000', mid: '#ff6600', high: '#ffcc00' },
  ice: { bass: '#0066ff', mid: '#00ccff', high: '#ffffff' },
  light: { bass: '#888888', mid: '#bbbbbb', high: '#ffffff' },
  dark: { bass: '#1a1a2e', mid: '#16213e', high: '#0f3460' },
  rainbow: { bass: '#ff0000', mid: '#00ff00', high: '#0000ff' }
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export class ParticlesVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationController: AnimationController | null = null
  private colorScheme: string
  private particles: Particle[] = []
  private maxParticles: number
  private gravity: number = 0.15
  private hue: number = 0

  constructor(options: ParticlesOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.maxParticles = options.maxParticles || 500

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
    this.animationController = new AnimationController(() => this.draw())
    this.animationController.start()
  }

  private spawnParticles(): void {
    if (!this.dataArray) return

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio
    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Divide frequency spectrum into bands
    const bandCount = 16
    const binSize = Math.floor(this.dataArray.length / bandCount)

    for (let band = 0; band < bandCount; band++) {
      // Calculate average energy for this band
      let sum = 0
      for (let i = 0; i < binSize; i++) {
        sum += this.dataArray[band * binSize + i]
      }
      const energy = sum / binSize / 255

      // Spawn particles based on energy
      const spawnRate = energy * 3
      if (Math.random() < spawnRate && this.particles.length < this.maxParticles) {
        // X position based on band (spread across width)
        const x = (band / bandCount) * width + (Math.random() - 0.5) * (width / bandCount)

        // Determine color based on frequency band
        let color: string
        if (this.colorScheme === 'rainbow') {
          color = `hsl(${(band / bandCount) * 360}, 100%, 60%)`
        } else if (band < bandCount / 3) {
          color = scheme.bass
        } else if (band < bandCount * 2 / 3) {
          color = scheme.mid
        } else {
          color = scheme.high
        }

        // Create particle
        this.particles.push({
          x,
          y: height,
          vx: (Math.random() - 0.5) * 3,
          vy: -(5 + energy * 15 + Math.random() * 5), // Upward velocity
          life: 1,
          maxLife: 60 + Math.random() * 60,
          color,
          size: 2 + energy * 4
        })
      }
    }
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear canvas (no background)
    this.ctx.clearRect(0, 0, width, height)

    // Spawn new particles
    this.spawnParticles()

    // Update and draw particles
    this.particles = this.particles.filter(particle => {
      // Apply gravity
      particle.vy += this.gravity

      // Update position
      particle.x += particle.vx
      particle.y += particle.vy

      // Update life
      particle.life -= 1 / particle.maxLife

      // Remove if dead or off screen
      if (particle.life <= 0 || particle.y > height + 10) {
        return false
      }

      // Draw particle with glow - fade out as it falls (life decreases)
      const alpha = particle.life * particle.life // Quadratic fade for smoother disappearance
      this.ctx.beginPath()
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      this.ctx.fillStyle = particle.color
      this.ctx.globalAlpha = alpha
      this.ctx.shadowBlur = 10 * alpha
      this.ctx.shadowColor = particle.color
      this.ctx.fill()

      return true
    })

    // Reset context state
    this.ctx.globalAlpha = 1
    this.ctx.shadowBlur = 0

    // Update rainbow hue
    this.hue = (this.hue + 1) % 360
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
