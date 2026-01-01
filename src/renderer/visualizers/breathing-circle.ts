/**
 * Breathing Circle Visualizer
 * Pulsing circle with organic breathing motion
 * Tentacles/cilia around edge react to frequency bands
 */

export interface BreathingCircleOptions {
  container: HTMLElement
  colorScheme?: string
  tentacleCount?: number
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const colorSchemes: Record<string, { core: string, glow: string, tentacle: string }> = {
  classic: { core: '#00ff00', glow: '#004400', tentacle: '#88ff00' },
  blue: { core: '#00ccff', glow: '#002244', tentacle: '#00aaff' },
  purple: { core: '#cc00ff', glow: '#220044', tentacle: '#ff00ff' },
  fire: { core: '#ff6600', glow: '#331100', tentacle: '#ffcc00' },
  ice: { core: '#00ffff', glow: '#002233', tentacle: '#aaffff' },
  light: { core: '#ffffff', glow: '#444444', tentacle: '#cccccc' },
  dark: { core: '#4a7a9e', glow: '#1a2a3e', tentacle: '#5a8aae' },
  rainbow: { core: '#ffffff', glow: '#222222', tentacle: '#ffffff' }
}

interface Tentacle {
  angle: number
  length: number
  phase: number
  freqBand: number
}

export class BreathingCircleVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private tentacles: Tentacle[] = []
  private tentacleCount: number
  private position: 'top' | 'bottom' | 'left' | 'right'
  private breathPhase: number = 0
  private hue: number = 0

  constructor(options: BreathingCircleOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.tentacleCount = options.tentacleCount || 32
    this.position = options.position || 'bottom'

    this.initTentacles()

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private initTentacles(): void {
    this.tentacles = []

    for (let i = 0; i < this.tentacleCount; i++) {
      this.tentacles.push({
        angle: (i / this.tentacleCount) * Math.PI * 2,
        length: 0.3 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        freqBand: i % 16
      })
    }
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
    const maxRadius = Math.min(width, height) * 0.35

    // Calculate center based on position (corner positioning)
    // Position mapping accounts for container rotation transforms
    let centerX: number
    let centerY: number

    switch (this.position) {
      case 'top': // top right corner - after scaleY(-1), use bottom-right canvas
        centerX = width - maxRadius * 1.1
        centerY = height - maxRadius * 1.1
        break
      case 'right': // bottom right corner - after rotate(-90deg), use bottom-left canvas
        centerX = maxRadius * 1.1
        centerY = height - maxRadius * 1.1
        break
      case 'bottom': // bottom left corner - no rotation, use bottom-left canvas
        centerX = maxRadius * 1.1
        centerY = height - maxRadius * 1.1
        break
      case 'left': // top left corner - after rotate(90deg), use top-left canvas
        centerX = maxRadius * 1.1
        centerY = maxRadius * 1.1
        break
      default:
        centerX = width / 2
        centerY = height / 2
    }

    // Calculate overall energy for breathing
    let totalEnergy = 0
    for (let i = 0; i < this.dataArray.length; i++) {
      totalEnergy += this.dataArray[i]
    }
    const avgEnergy = totalEnergy / this.dataArray.length / 255

    // Breathing effect
    const breathScale = 1 + Math.sin(this.breathPhase) * 0.1 + avgEnergy * 0.2
    const baseRadius = maxRadius * 0.4 * breathScale

    // Calculate energy per frequency band
    const bandSize = Math.floor(this.dataArray.length / 16)
    const bandEnergies: number[] = []
    for (let i = 0; i < 16; i++) {
      let sum = 0
      for (let j = 0; j < bandSize; j++) {
        sum += this.dataArray[i * bandSize + j]
      }
      bandEnergies.push(sum / bandSize / 255)
    }

    // Draw outer glow
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, baseRadius * 0.5,
      centerX, centerY, maxRadius
    )

    if (this.colorScheme === 'rainbow') {
      gradient.addColorStop(0, `hsla(${this.hue}, 80%, 50%, ${0.3 + avgEnergy * 0.3})`)
      gradient.addColorStop(1, 'transparent')
    } else {
      gradient.addColorStop(0, scheme.glow)
      gradient.addColorStop(1, 'transparent')
    }

    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2)
    this.ctx.fillStyle = gradient
    this.ctx.fill()

    // Draw tentacles
    for (const tentacle of this.tentacles) {
      const energy = bandEnergies[tentacle.freqBand]
      const tentacleLength = baseRadius * tentacle.length * (1 + energy * 2)

      // Wave motion on tentacle
      const waveOffset = Math.sin(this.breathPhase * 2 + tentacle.phase) * 0.2

      this.ctx.beginPath()

      // Start from circle edge
      const startX = centerX + Math.cos(tentacle.angle) * baseRadius
      const startY = centerY + Math.sin(tentacle.angle) * baseRadius

      // End point with wave
      const endAngle = tentacle.angle + waveOffset * energy
      const endX = centerX + Math.cos(endAngle) * (baseRadius + tentacleLength)
      const endY = centerY + Math.sin(endAngle) * (baseRadius + tentacleLength)

      // Control point for curve
      const midAngle = tentacle.angle + waveOffset * 0.5
      const midDist = baseRadius + tentacleLength * 0.6
      const cpX = centerX + Math.cos(midAngle) * midDist
      const cpY = centerY + Math.sin(midAngle) * midDist

      this.ctx.moveTo(startX, startY)
      this.ctx.quadraticCurveTo(cpX, cpY, endX, endY)

      if (this.colorScheme === 'rainbow') {
        this.ctx.strokeStyle = `hsla(${(this.hue + tentacle.freqBand * 20) % 360}, 100%, ${50 + energy * 30}%, ${0.5 + energy * 0.5})`
      } else {
        this.ctx.strokeStyle = scheme.tentacle
        this.ctx.globalAlpha = 0.5 + energy * 0.5
      }

      this.ctx.lineWidth = 2 + energy * 3
      this.ctx.lineCap = 'round'
      this.ctx.stroke()
      this.ctx.globalAlpha = 1

      // Draw tip glow
      if (energy > 0.3) {
        this.ctx.beginPath()
        this.ctx.arc(endX, endY, 2 + energy * 4, 0, Math.PI * 2)

        if (this.colorScheme === 'rainbow') {
          this.ctx.fillStyle = `hsl(${(this.hue + tentacle.freqBand * 20) % 360}, 100%, 70%)`
        } else {
          this.ctx.fillStyle = scheme.tentacle
        }

        this.ctx.shadowBlur = 10
        this.ctx.shadowColor = scheme.tentacle
        this.ctx.fill()
        this.ctx.shadowBlur = 0
      }
    }

    // Draw core circle
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2)

    const coreGradient = this.ctx.createRadialGradient(
      centerX - baseRadius * 0.2, centerY - baseRadius * 0.2, 0,
      centerX, centerY, baseRadius
    )

    if (this.colorScheme === 'rainbow') {
      coreGradient.addColorStop(0, `hsl(${this.hue}, 100%, 80%)`)
      coreGradient.addColorStop(0.5, `hsl(${this.hue}, 100%, 50%)`)
      coreGradient.addColorStop(1, `hsl(${(this.hue + 60) % 360}, 80%, 30%)`)
    } else {
      coreGradient.addColorStop(0, scheme.core)
      coreGradient.addColorStop(1, scheme.glow)
    }

    this.ctx.fillStyle = coreGradient
    this.ctx.shadowBlur = 20 + avgEnergy * 20
    this.ctx.shadowColor = scheme.core
    this.ctx.fill()

    // Inner glow
    this.ctx.beginPath()
    this.ctx.arc(centerX - baseRadius * 0.2, centerY - baseRadius * 0.2, baseRadius * 0.3, 0, Math.PI * 2)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.shadowBlur = 0
    this.ctx.fill()

    // Update animation
    this.breathPhase += 0.03 + avgEnergy * 0.02
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
