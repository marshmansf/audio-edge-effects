/**
 * Polygon Morph Visualizer
 * Shape morphs between triangle/square/pentagon/hexagon/heptagon/octagon based on frequency
 * Size pulses with amplitude, includes inner rings and smooth morphing
 */

export interface PolygonMorphOptions {
  container: HTMLElement
  colorScheme?: string
  ringCount?: number
}

const colorSchemes: Record<string, { stroke: string, fill: string, glow: string }> = {
  classic: { stroke: '#00ff00', fill: 'rgba(0, 255, 0, 0.1)', glow: '#00ff00' },
  blue: { stroke: '#00ccff', fill: 'rgba(0, 204, 255, 0.1)', glow: '#00ccff' },
  purple: { stroke: '#cc00ff', fill: 'rgba(204, 0, 255, 0.1)', glow: '#cc00ff' },
  fire: { stroke: '#ff6600', fill: 'rgba(255, 102, 0, 0.1)', glow: '#ff6600' },
  ice: { stroke: '#00ffff', fill: 'rgba(0, 255, 255, 0.1)', glow: '#00ffff' },
  light: { stroke: '#ffffff', fill: 'rgba(255, 255, 255, 0.1)', glow: '#ffffff' },
  dark: { stroke: '#4a7a9e', fill: 'rgba(74, 122, 158, 0.1)', glow: '#4a7a9e' },
  rainbow: { stroke: '#ffffff', fill: 'rgba(255, 255, 255, 0.1)', glow: '#ffffff' }
}

export class PolygonMorphVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private ringCount: number
  private currentSides: number = 3
  private targetSides: number = 3
  private rotation: number = 0
  private innerRotation: number = 0
  private hue: number = 0
  private morphProgress: number = 0

  constructor(options: PolygonMorphOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.ringCount = options.ringCount || 4

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

  private drawMorphingPolygon(cx: number, cy: number, radius: number, sides: number, rotation: number, morphAmount: number): void {
    const wholeSides = Math.floor(sides)
    const nextSides = wholeSides + 1
    const fraction = sides - wholeSides

    this.ctx.beginPath()

    // Draw points interpolating between current and next polygon
    const points = Math.max(wholeSides, nextSides) * 4 // More points for smooth morphing

    for (let i = 0; i <= points; i++) {
      const t = i / points

      // Calculate angle for current polygon shape
      const currentAngle = rotation + t * Math.PI * 2

      // Calculate distance from center for current shape
      // Uses sine wave to create polygon vertices
      const currentVertexDist = this.getPolygonRadius(currentAngle, wholeSides, rotation)
      const nextVertexDist = this.getPolygonRadius(currentAngle, nextSides, rotation)

      // Interpolate between shapes
      const dist = currentVertexDist * (1 - fraction) + nextVertexDist * fraction

      // Add morph distortion
      const morphDistort = Math.sin(currentAngle * 3 + this.morphProgress) * morphAmount * 0.1

      const finalRadius = radius * (dist + morphDistort)
      const x = cx + Math.cos(currentAngle) * finalRadius
      const y = cy + Math.sin(currentAngle) * finalRadius

      if (i === 0) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }
    }
    this.ctx.closePath()
  }

  private getPolygonRadius(angle: number, sides: number, rotation: number): number {
    // Calculate how "sharp" the polygon is at this angle
    const relativeAngle = (angle - rotation) % (Math.PI * 2 / sides)
    const normalizedAngle = relativeAngle / (Math.PI * 2 / sides)
    const distFromVertex = Math.abs(normalizedAngle - 0.5) * 2

    // Cosine gives us the distance to edge at this angle
    const halfAngle = Math.PI / sides
    return Math.cos(halfAngle) / Math.cos(halfAngle * (1 - distFromVertex * 2))
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

    // Calculate frequency band energies
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

    // Map bass to number of sides (3-8) - more dramatic response
    this.targetSides = 3 + bassEnergy * 5

    // Smooth transition to target sides
    this.currentSides += (this.targetSides - this.currentSides) * 0.08

    // Base radius plus energy-based pulsing
    const baseRadius = Math.min(width, height) * 0.35
    const radius = baseRadius * (0.6 + bassEnergy * 0.6)

    // Draw multiple concentric rings
    for (let ring = this.ringCount - 1; ring >= 0; ring--) {
      const ringRadius = radius * (0.3 + ring * (0.7 / this.ringCount))
      const ringSides = this.currentSides + ring * 0.3
      const ringRotation = this.rotation + (ring % 2 === 0 ? 1 : -1) * this.innerRotation

      this.drawMorphingPolygon(centerX, centerY, ringRadius, ringSides, ringRotation, midEnergy)

      // Fill with gradient
      const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, ringRadius)
      if (this.colorScheme === 'rainbow') {
        const hue = (this.hue + ring * 40) % 360
        gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, ${0.1 + midEnergy * 0.2})`)
        gradient.addColorStop(1, `hsla(${(hue + 30) % 360}, 100%, 40%, 0.05)`)
        this.ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`
        this.ctx.shadowColor = `hsl(${hue}, 100%, 60%)`
      } else {
        gradient.addColorStop(0, scheme.fill)
        gradient.addColorStop(1, 'transparent')
        this.ctx.strokeStyle = scheme.stroke
        this.ctx.shadowColor = scheme.glow
      }

      this.ctx.fillStyle = gradient
      this.ctx.globalAlpha = 0.3 + (this.ringCount - ring) * (0.6 / this.ringCount)
      this.ctx.fill()

      this.ctx.lineWidth = 1 + (this.ringCount - ring) * (2 / this.ringCount) + highEnergy * 2
      this.ctx.shadowBlur = 10 + highEnergy * 15
      this.ctx.stroke()
    }

    // Draw main outer polygon
    this.drawMorphingPolygon(centerX, centerY, radius, this.currentSides, this.rotation, midEnergy)

    if (this.colorScheme === 'rainbow') {
      this.ctx.strokeStyle = `hsl(${this.hue}, 100%, 70%)`
      this.ctx.shadowColor = `hsl(${this.hue}, 100%, 60%)`
    } else {
      this.ctx.strokeStyle = scheme.stroke
      this.ctx.shadowColor = scheme.glow
    }

    this.ctx.globalAlpha = 1
    this.ctx.lineWidth = 3 + bassEnergy * 4
    this.ctx.shadowBlur = 20 + bassEnergy * 25
    this.ctx.stroke()

    // Draw vertex highlights
    const wholeSides = Math.round(this.currentSides)
    for (let i = 0; i < wholeSides; i++) {
      const angle = this.rotation + (i / wholeSides) * Math.PI * 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      // Vertex glow
      const vertexGradient = this.ctx.createRadialGradient(x, y, 0, x, y, 8 + highEnergy * 12)
      if (this.colorScheme === 'rainbow') {
        vertexGradient.addColorStop(0, `hsla(${(this.hue + i * 45) % 360}, 100%, 80%, 0.8)`)
        vertexGradient.addColorStop(1, 'transparent')
      } else {
        vertexGradient.addColorStop(0, scheme.stroke)
        vertexGradient.addColorStop(1, 'transparent')
      }

      this.ctx.beginPath()
      this.ctx.arc(x, y, 8 + highEnergy * 12, 0, Math.PI * 2)
      this.ctx.fillStyle = vertexGradient
      this.ctx.shadowBlur = 0
      this.ctx.fill()
    }

    this.ctx.shadowBlur = 0

    // Update animations
    this.rotation += 0.01 + midEnergy * 0.03
    this.innerRotation += 0.02 + highEnergy * 0.04
    this.morphProgress += 0.05 + bassEnergy * 0.1
    this.hue = (this.hue + 0.5 + highEnergy * 2) % 360
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
