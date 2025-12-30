/**
 * VU Meters Visualizer
 * Classic analog VU meter needles with realistic inertia
 */

export interface VuMetersOptions {
  container: HTMLElement
  colorScheme?: string
}

const colorSchemes: Record<string, { needle: string, face: string, danger: string, markings: string }> = {
  classic: { needle: '#00ff00', face: '#001100', danger: '#ff0000', markings: '#00aa00' },
  blue: { needle: '#00ccff', face: '#001122', danger: '#ff4444', markings: '#0088aa' },
  purple: { needle: '#cc00ff', face: '#110022', danger: '#ff4444', markings: '#8800aa' },
  fire: { needle: '#ffcc00', face: '#111100', danger: '#ff0000', markings: '#aa8800' },
  ice: { needle: '#00ffff', face: '#001122', danger: '#ff6666', markings: '#00aaaa' },
  light: { needle: '#000000', face: '#dddddd', danger: '#ff0000', markings: '#666666' },
  dark: { needle: '#5a7a9e', face: '#0a1a2e', danger: '#cc4444', markings: '#3a5a7e' },
  rainbow: { needle: '#ffffff', face: '#111111', danger: '#ff0000', markings: '#888888' }
}

interface VuMeter {
  angle: number
  velocity: number
  targetAngle: number
  peakAngle: number
  peakHoldTime: number
}

export class VuMetersVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private meters: VuMeter[] = []
  private hue: number = 0

  constructor(options: VuMetersOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'

    // Initialize two meters (L/R or duplicate for mono)
    this.meters = [
      { angle: -Math.PI / 4, velocity: 0, targetAngle: -Math.PI / 4, peakAngle: -Math.PI / 4, peakHoldTime: 0 },
      { angle: -Math.PI / 4, velocity: 0, targetAngle: -Math.PI / 4, peakAngle: -Math.PI / 4, peakHoldTime: 0 }
    ]

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
    this.draw()
  }

  private drawMeter(centerX: number, centerY: number, radius: number, meter: VuMeter, label: string): void {
    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Draw meter face (arc background)
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, radius, -Math.PI * 0.8, -Math.PI * 0.2, false)
    this.ctx.lineTo(centerX, centerY)
    this.ctx.closePath()
    this.ctx.fillStyle = scheme.face
    this.ctx.fill()

    // Draw scale markings
    const minAngle = -Math.PI * 0.75
    const maxAngle = -Math.PI * 0.25
    const dangerStart = -Math.PI * 0.35

    for (let i = 0; i <= 10; i++) {
      const angle = minAngle + (i / 10) * (maxAngle - minAngle)
      const innerRadius = radius * 0.7
      const outerRadius = i % 5 === 0 ? radius * 0.9 : radius * 0.85

      const x1 = centerX + Math.cos(angle) * innerRadius
      const y1 = centerY + Math.sin(angle) * innerRadius
      const x2 = centerX + Math.cos(angle) * outerRadius
      const y2 = centerY + Math.sin(angle) * outerRadius

      this.ctx.beginPath()
      this.ctx.moveTo(x1, y1)
      this.ctx.lineTo(x2, y2)

      if (angle > dangerStart) {
        this.ctx.strokeStyle = scheme.danger
      } else if (this.colorScheme === 'rainbow') {
        this.ctx.strokeStyle = `hsl(${(this.hue + i * 20) % 360}, 80%, 60%)`
      } else {
        this.ctx.strokeStyle = scheme.markings
      }

      this.ctx.lineWidth = i % 5 === 0 ? 2 : 1
      this.ctx.stroke()
    }

    // Draw danger zone arc
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, radius * 0.6, dangerStart, maxAngle)
    this.ctx.strokeStyle = scheme.danger
    this.ctx.lineWidth = 3
    this.ctx.globalAlpha = 0.3
    this.ctx.stroke()
    this.ctx.globalAlpha = 1

    // Draw peak indicator
    if (meter.peakHoldTime > 0) {
      const peakX = centerX + Math.cos(meter.peakAngle) * radius * 0.85
      const peakY = centerY + Math.sin(meter.peakAngle) * radius * 0.85

      this.ctx.beginPath()
      this.ctx.arc(peakX, peakY, 3, 0, Math.PI * 2)
      this.ctx.fillStyle = meter.peakAngle > dangerStart ? scheme.danger : scheme.needle
      this.ctx.fill()
    }

    // Draw needle
    const needleLength = radius * 0.9
    const needleX = centerX + Math.cos(meter.angle) * needleLength
    const needleY = centerY + Math.sin(meter.angle) * needleLength

    // Needle shadow
    this.ctx.beginPath()
    this.ctx.moveTo(centerX + 2, centerY + 2)
    this.ctx.lineTo(needleX + 2, needleY + 2)
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.lineWidth = 3
    this.ctx.lineCap = 'round'
    this.ctx.stroke()

    // Main needle
    this.ctx.beginPath()
    this.ctx.moveTo(centerX, centerY)
    this.ctx.lineTo(needleX, needleY)

    if (this.colorScheme === 'rainbow') {
      this.ctx.strokeStyle = `hsl(${this.hue}, 100%, 60%)`
      this.ctx.shadowColor = `hsl(${this.hue}, 100%, 60%)`
    } else {
      this.ctx.strokeStyle = meter.angle > dangerStart ? scheme.danger : scheme.needle
      this.ctx.shadowColor = scheme.needle
    }

    this.ctx.lineWidth = 3
    this.ctx.shadowBlur = 10
    this.ctx.stroke()
    this.ctx.shadowBlur = 0

    // Needle pivot
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, 6, 0, Math.PI * 2)
    this.ctx.fillStyle = scheme.markings
    this.ctx.fill()

    // Label
    this.ctx.font = `${radius * 0.15}px monospace`
    this.ctx.fillStyle = scheme.markings
    this.ctx.textAlign = 'center'
    this.ctx.fillText(label, centerX, centerY + radius * 0.4)
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    this.ctx.clearRect(0, 0, width, height)

    // Calculate RMS energy (simulating L/R by splitting spectrum)
    const halfLength = Math.floor(this.dataArray.length / 2)

    let leftEnergy = 0
    let rightEnergy = 0

    for (let i = 0; i < halfLength; i++) {
      leftEnergy += this.dataArray[i] * this.dataArray[i]
      rightEnergy += this.dataArray[halfLength + i] * this.dataArray[halfLength + i]
    }

    leftEnergy = Math.sqrt(leftEnergy / halfLength) / 255
    rightEnergy = Math.sqrt(rightEnergy / halfLength) / 255

    const energies = [leftEnergy, rightEnergy]
    const minAngle = -Math.PI * 0.75
    const maxAngle = -Math.PI * 0.25
    const angleRange = maxAngle - minAngle

    // Update meters with physics
    for (let i = 0; i < this.meters.length; i++) {
      const meter = this.meters[i]
      const energy = energies[i]

      // Target angle based on energy
      meter.targetAngle = minAngle + energy * angleRange

      // Spring physics for needle
      const stiffness = 0.15
      const damping = 0.5

      const force = (meter.targetAngle - meter.angle) * stiffness
      meter.velocity += force
      meter.velocity *= damping
      meter.angle += meter.velocity

      // Clamp angle
      meter.angle = Math.max(minAngle, Math.min(maxAngle, meter.angle))

      // Peak hold
      if (meter.angle > meter.peakAngle || meter.peakHoldTime <= 0) {
        meter.peakAngle = meter.angle
        meter.peakHoldTime = 30
      } else {
        meter.peakHoldTime--
        if (meter.peakHoldTime <= 0) {
          meter.peakAngle -= 0.02
        }
      }
    }

    // Draw meters
    const meterRadius = Math.min(width / 4, height * 0.8)
    const spacing = width / 3

    this.drawMeter(spacing, height * 0.7, meterRadius, this.meters[0], 'L')
    this.drawMeter(spacing * 2, height * 0.7, meterRadius, this.meters[1], 'R')

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
