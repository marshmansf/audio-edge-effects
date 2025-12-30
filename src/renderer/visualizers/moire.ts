/**
 * Moire Visualizer
 * Overlapping line patterns creating interference patterns
 * Frequency controls line spacing and angle
 */

export interface MoireOptions {
  container: HTMLElement
  colorScheme?: string
  lineCount?: number
}

const colorSchemes: Record<string, { lines1: string, lines2: string }> = {
  classic: { lines1: '#00ff00', lines2: '#00aa00' },
  blue: { lines1: '#00ccff', lines2: '#0066ff' },
  purple: { lines1: '#cc00ff', lines2: '#6600aa' },
  fire: { lines1: '#ff6600', lines2: '#ff0000' },
  ice: { lines1: '#00ffff', lines2: '#0088ff' },
  light: { lines1: '#ffffff', lines2: '#cccccc' },
  dark: { lines1: '#4a7a9e', lines2: '#2a5a7e' },
  rainbow: { lines1: '#ffffff', lines2: '#888888' }
}

export class MoireVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private lineCount: number
  private rotation1: number = 0
  private rotation2: number = 0
  private spacing1: number = 10
  private spacing2: number = 12
  private hue: number = 0

  constructor(options: MoireOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.lineCount = options.lineCount || 50

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

  private drawLinePattern(
    centerX: number, centerY: number,
    rotation: number, spacing: number,
    color: string, lineWidth: number
  ): void {
    const diagonal = Math.sqrt(
      Math.pow(this.canvas.width, 2) + Math.pow(this.canvas.height, 2)
    ) / window.devicePixelRatio

    this.ctx.save()
    this.ctx.translate(centerX, centerY)
    this.ctx.rotate(rotation)

    this.ctx.strokeStyle = color
    this.ctx.lineWidth = lineWidth

    const lineCount = Math.ceil(diagonal / spacing) + 1

    this.ctx.beginPath()
    for (let i = -lineCount; i <= lineCount; i++) {
      const x = i * spacing
      this.ctx.moveTo(x, -diagonal)
      this.ctx.lineTo(x, diagonal)
    }
    this.ctx.stroke()

    this.ctx.restore()
  }

  private drawCircularPattern(
    centerX: number, centerY: number,
    spacing: number, color: string, lineWidth: number
  ): void {
    const diagonal = Math.sqrt(
      Math.pow(this.canvas.width, 2) + Math.pow(this.canvas.height, 2)
    ) / window.devicePixelRatio

    this.ctx.strokeStyle = color
    this.ctx.lineWidth = lineWidth

    const circleCount = Math.ceil(diagonal / spacing)

    for (let i = 1; i <= circleCount; i++) {
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, i * spacing, 0, Math.PI * 2)
      this.ctx.stroke()
    }
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Clear canvas with transparency
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

    // Update pattern parameters based on audio
    this.spacing1 = 8 + bassEnergy * 15
    this.spacing2 = 10 + midEnergy * 12

    // Rotate patterns
    this.rotation1 += 0.002 + highEnergy * 0.01
    this.rotation2 -= 0.003 + midEnergy * 0.008

    const centerX = width / 2 + Math.sin(this.rotation1 * 2) * 20 * bassEnergy
    const centerY = height / 2 + Math.cos(this.rotation2 * 2) * 20 * bassEnergy

    // Set composite operation for interference
    this.ctx.globalCompositeOperation = 'screen'

    const lineWidth = 1 + bassEnergy

    // Pattern 1 - Lines
    if (this.colorScheme === 'rainbow') {
      this.ctx.strokeStyle = `hsl(${this.hue}, 80%, 50%)`
    }
    this.drawLinePattern(
      centerX, centerY,
      this.rotation1,
      this.spacing1,
      this.colorScheme === 'rainbow' ? `hsl(${this.hue}, 80%, 50%)` : scheme.lines1,
      lineWidth
    )

    // Pattern 2 - Lines at different angle
    this.drawLinePattern(
      centerX, centerY,
      this.rotation2,
      this.spacing2,
      this.colorScheme === 'rainbow' ? `hsl(${(this.hue + 60) % 360}, 80%, 50%)` : scheme.lines2,
      lineWidth
    )

    // Pattern 3 - Circles for extra complexity
    if (bassEnergy > 0.3) {
      const circleSpacing = 15 + (1 - bassEnergy) * 20
      this.drawCircularPattern(
        centerX, centerY,
        circleSpacing,
        this.colorScheme === 'rainbow' ? `hsl(${(this.hue + 120) % 360}, 60%, 40%)` : scheme.lines1,
        0.5
      )
    }

    this.ctx.globalCompositeOperation = 'source-over'

    // Apply edge fade - content fades to transparent the further from screen edge
    // Create a gradient mask: transparent at top/left (away from edge), opaque at bottom/right (screen edge)
    this.ctx.globalCompositeOperation = 'destination-in'

    // Determine which edge we're on based on aspect ratio (wider = top/bottom, taller = left/right)
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
    this.ctx.globalAlpha = 1
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
