/**
 * Spiral Visualizer
 * Frequency data mapped to a rotating/pulsing Archimedean spiral
 * Bass = tighter spiral
 */

export interface SpiralOptions {
  container: HTMLElement
  colorScheme?: string
  pointCount?: number
}

const colorSchemes: Record<string, { primary: string, secondary: string }> = {
  classic: { primary: '#00ff00', secondary: '#88ff00' },
  blue: { primary: '#00ccff', secondary: '#0088ff' },
  purple: { primary: '#cc00ff', secondary: '#8800ff' },
  fire: { primary: '#ff6600', secondary: '#ff0000' },
  ice: { primary: '#00ffff', secondary: '#0088ff' },
  light: { primary: '#ffffff', secondary: '#cccccc' },
  dark: { primary: '#4a7a9e', secondary: '#2a5a7e' },
  rainbow: { primary: '#ff00ff', secondary: '#00ffff' }
}

export class SpiralVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private pointCount: number
  private rotation: number = 0
  private hue: number = 0

  constructor(options: SpiralOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.pointCount = options.pointCount || 500

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
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) * 0.45

    // Calculate bass energy (first 15% of spectrum)
    const bassEnd = Math.floor(this.dataArray.length * 0.15)
    let bassEnergy = 0
    for (let i = 0; i < bassEnd; i++) {
      bassEnergy += this.dataArray[i]
    }
    bassEnergy = bassEnergy / bassEnd / 255

    // Calculate overall energy
    let totalEnergy = 0
    for (let i = 0; i < this.dataArray.length; i++) {
      totalEnergy += this.dataArray[i]
    }
    const avgEnergy = totalEnergy / this.dataArray.length / 255

    // Spiral parameters - tighter when bass is heavy
    const spiralTightness = 0.15 - bassEnergy * 0.08
    const turns = 4 + bassEnergy * 2

    this.ctx.beginPath()

    for (let i = 0; i < this.pointCount; i++) {
      const t = (i / this.pointCount) * turns * Math.PI * 2
      const progress = i / this.pointCount

      // Sample frequency data along the spiral
      const freqIndex = Math.floor(progress * this.dataArray.length * 0.5)
      const freqValue = this.dataArray[freqIndex] / 255

      // Base radius grows outward
      const baseRadius = progress * maxRadius

      // Modulate radius by frequency data
      const radiusModulation = freqValue * 15 * progress

      const r = baseRadius * spiralTightness * t / (Math.PI * 2) + radiusModulation
      const angle = t + this.rotation

      const x = centerX + Math.cos(angle) * Math.min(r, maxRadius)
      const y = centerY + Math.sin(angle) * Math.min(r, maxRadius)

      if (i === 0) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }
    }

    // Draw spiral
    const gradient = this.ctx.createLinearGradient(0, 0, width, height)
    if (this.colorScheme === 'rainbow') {
      gradient.addColorStop(0, `hsl(${this.hue}, 100%, 60%)`)
      gradient.addColorStop(0.5, `hsl(${(this.hue + 120) % 360}, 100%, 60%)`)
      gradient.addColorStop(1, `hsl(${(this.hue + 240) % 360}, 100%, 60%)`)
    } else {
      gradient.addColorStop(0, scheme.secondary)
      gradient.addColorStop(1, scheme.primary)
    }

    this.ctx.strokeStyle = gradient
    this.ctx.lineWidth = 2 + avgEnergy * 3
    this.ctx.shadowBlur = 15 + avgEnergy * 15
    this.ctx.shadowColor = scheme.primary
    this.ctx.lineCap = 'round'
    this.ctx.stroke()

    // Draw center glow
    const centerGlowRadius = 10 + bassEnergy * 30

    const centerGradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, centerGlowRadius
    )

    if (this.colorScheme === 'rainbow') {
      centerGradient.addColorStop(0, `hsla(${this.hue}, 100%, 70%, 0.8)`)
      centerGradient.addColorStop(1, `hsla(${this.hue}, 100%, 50%, 0)`)
    } else {
      centerGradient.addColorStop(0, scheme.primary)
      centerGradient.addColorStop(1, 'transparent')
    }

    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, centerGlowRadius, 0, Math.PI * 2)
    this.ctx.fillStyle = centerGradient
    this.ctx.fill()

    this.ctx.shadowBlur = 0

    // Update rotation
    this.rotation += 0.02 + avgEnergy * 0.05
    this.hue = (this.hue + 1) % 360
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
