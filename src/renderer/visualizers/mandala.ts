/**
 * Mandala Visualizer
 * Radially symmetric kaleidoscope patterns evolving with music
 * Transparent background
 */

export interface MandalaOptions {
  container: HTMLElement
  colorScheme?: string
  symmetry?: number
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const colorSchemes: Record<string, string[]> = {
  classic: ['#00ff00', '#00cc00', '#009900', '#006600'],
  blue: ['#00ccff', '#0099ff', '#0066ff', '#0033ff'],
  purple: ['#ff00ff', '#cc00ff', '#9900ff', '#6600ff'],
  fire: ['#ffcc00', '#ff9900', '#ff6600', '#ff3300'],
  ice: ['#ffffff', '#ccffff', '#99ffff', '#66ccff'],
  light: ['#ffffff', '#dddddd', '#bbbbbb', '#999999'],
  dark: ['#4a7a9e', '#3a6a8e', '#2a5a7e', '#1a4a6e'],
  rainbow: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff']
}

interface Petal {
  angle: number
  length: number
  curve: number
  width: number
}

export class MandalaVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private symmetry: number
  private position: 'top' | 'bottom' | 'left' | 'right'
  private rotation: number = 0
  private petals: Petal[] = []
  private hue: number = 0
  private time: number = 0

  constructor(options: MandalaOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.symmetry = options.symmetry || 8
    this.position = options.position || 'bottom'

    // Initialize petals
    for (let i = 0; i < 8; i++) {
      this.petals.push({
        angle: 0,
        length: 0.5 + Math.random() * 0.5,
        curve: Math.random() * 0.5,
        width: 0.1 + Math.random() * 0.2
      })
    }

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

  private drawPetal(cx: number, cy: number, radius: number, petal: Petal, energy: number, colorIndex: number): void {
    const colors = colorSchemes[this.colorScheme] || colorSchemes.classic
    const length = radius * petal.length * (0.5 + energy * 0.5)
    const width = radius * petal.width * (0.5 + energy * 0.5)

    this.ctx.save()
    this.ctx.translate(cx, cy)
    this.ctx.rotate(petal.angle)

    // Draw petal shape using bezier curves
    this.ctx.beginPath()
    this.ctx.moveTo(0, 0)

    const controlX = width * (1 + petal.curve * energy * 2)
    const controlY = length * 0.5

    this.ctx.bezierCurveTo(
      controlX, controlY,
      controlX, length - controlY * 0.5,
      0, length
    )

    this.ctx.bezierCurveTo(
      -controlX, length - controlY * 0.5,
      -controlX, controlY,
      0, 0
    )

    // Color based on scheme
    if (this.colorScheme === 'rainbow') {
      const hue = (this.hue + colorIndex * 45) % 360
      this.ctx.fillStyle = `hsla(${hue}, 80%, 50%, ${0.4 + energy * 0.4})`
      this.ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`
    } else {
      const color = colors[colorIndex % colors.length]
      this.ctx.fillStyle = color
      this.ctx.globalAlpha = 0.3 + energy * 0.4
      this.ctx.strokeStyle = color
    }

    this.ctx.fill()
    this.ctx.globalAlpha = 0.8 + energy * 0.2
    this.ctx.lineWidth = 1 + energy * 2
    this.ctx.stroke()

    this.ctx.restore()
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear with transparent background
    this.ctx.clearRect(0, 0, width, height)

    const maxRadius = Math.min(width, height) * 0.45

    // Calculate center based on position (corner positioning)
    // Position mapping accounts for container rotation transforms
    let centerX: number
    let centerY: number

    switch (this.position) {
      case 'top': // top right corner - after scaleY(-1), use bottom-right canvas
        centerX = width - maxRadius * 0.9
        centerY = height - maxRadius * 0.9
        break
      case 'right': // bottom right corner - after rotate(-90deg)
        centerX = maxRadius * 0.9 + height / 4 - 5
        centerY = height - maxRadius * 0.9
        break
      case 'bottom': // bottom left corner - no rotation, use bottom-left canvas
        centerX = maxRadius * 0.9
        centerY = height - maxRadius * 0.9
        break
      case 'left': // top left corner - after rotate(90deg), use bottom-left canvas
        centerX = maxRadius * 0.9
        centerY = height - maxRadius * 0.9
        break
      default:
        centerX = width / 2
        centerY = height / 2
    }

    // Calculate energy per petal from frequency bands
    const bandSize = Math.floor(this.dataArray.length / this.petals.length)
    const energies: number[] = []

    for (let i = 0; i < this.petals.length; i++) {
      let sum = 0
      for (let j = 0; j < bandSize; j++) {
        sum += this.dataArray[i * bandSize + j]
      }
      energies.push(sum / bandSize / 255)
    }

    // Calculate overall energy for rotation speed
    const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length

    // Draw multiple rings of petals
    const rings = 3
    for (let ring = rings - 1; ring >= 0; ring--) {
      const ringRadius = maxRadius * (0.3 + ring * 0.25)
      const ringSymmetry = this.symmetry + ring * 2

      // Draw petals for this ring with radial symmetry
      for (let s = 0; s < ringSymmetry; s++) {
        const baseAngle = (s / ringSymmetry) * Math.PI * 2 + this.rotation * (ring % 2 === 0 ? 1 : -1)

        for (let p = 0; p < this.petals.length; p++) {
          const petal = { ...this.petals[p] }
          petal.angle = baseAngle + (p / this.petals.length) * (Math.PI * 2 / ringSymmetry) * 0.3

          const energy = energies[p] * (1 - ring * 0.2)

          this.ctx.globalAlpha = 1 - ring * 0.2
          this.drawPetal(centerX, centerY, ringRadius, petal, energy, (s + p + ring) % 8)
        }
      }
    }

    this.ctx.globalAlpha = 1

    // Draw center orb
    const centerEnergy = energies.slice(0, 2).reduce((a, b) => a + b, 0) / 2
    const orbRadius = 10 + centerEnergy * 20

    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, orbRadius
    )

    if (this.colorScheme === 'rainbow') {
      gradient.addColorStop(0, `hsla(${this.hue}, 100%, 80%, 1)`)
      gradient.addColorStop(0.5, `hsla(${(this.hue + 60) % 360}, 100%, 60%, 0.5)`)
      gradient.addColorStop(1, 'transparent')
    } else {
      const colors = colorSchemes[this.colorScheme]
      gradient.addColorStop(0, colors[0])
      gradient.addColorStop(0.5, colors[1])
      gradient.addColorStop(1, 'transparent')
    }

    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2)
    this.ctx.fillStyle = gradient
    this.ctx.shadowBlur = 20
    this.ctx.shadowColor = colorSchemes[this.colorScheme]?.[0] || '#ffffff'
    this.ctx.fill()

    this.ctx.shadowBlur = 0

    // Update animation
    this.rotation += 0.005 + avgEnergy * 0.02
    this.hue = (this.hue + 0.5) % 360
    this.time += 0.02
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
