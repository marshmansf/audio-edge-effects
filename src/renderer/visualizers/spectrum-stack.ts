/**
 * Spectrum Stack Visualizer
 * Historical frequency bars in 3D perspective (mountain ridges receding into distance)
 */

export interface SpectrumStackOptions {
  container: HTMLElement
  colorScheme?: string
}

const colorSchemes: Record<string, { near: string, far: string, fill: string }> = {
  classic: { near: '#00ff00', far: '#002200', fill: '#004400' },
  blue: { near: '#00ccff', far: '#001133', fill: '#003366' },
  purple: { near: '#cc00ff', far: '#110022', fill: '#330044' },
  fire: { near: '#ffcc00', far: '#220000', fill: '#441100' },
  ice: { near: '#ffffff', far: '#001122', fill: '#002244' },
  light: { near: '#ffffff', far: '#222222', fill: '#444444' },
  dark: { near: '#4a7a9e', far: '#0a1a2e', fill: '#1a3a5e' },
  rainbow: { near: '#ffffff', far: '#000022', fill: '#111133' }
}

export class SpectrumStackVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private history: number[][] = []
  private maxHistory: number = 20
  private hue: number = 0

  constructor(options: SpectrumStackOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'

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
    this.history = []
    this.draw()
  }

  private interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = this.hexToRgb(color1)
    const c2 = this.hexToRgb(color2)

    const r = Math.round(c1.r + (c2.r - c1.r) * factor)
    const g = Math.round(c1.g + (c2.g - c1.g) * factor)
    const b = Math.round(c1.b + (c2.b - c1.b) * factor)

    return `rgb(${r}, ${g}, ${b})`
  }

  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    this.ctx.clearRect(0, 0, width, height)

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Sample current frequency data
    const resolution = 64
    const currentSlice: number[] = []
    const binSize = Math.floor(this.dataArray.length / resolution)

    for (let i = 0; i < resolution; i++) {
      let sum = 0
      for (let j = 0; j < binSize; j++) {
        sum += this.dataArray[i * binSize + j]
      }
      currentSlice.push(sum / binSize / 255)
    }

    // Add to history
    this.history.unshift(currentSlice)
    if (this.history.length > this.maxHistory) {
      this.history.pop()
    }

    // Draw from back to front
    for (let z = this.history.length - 1; z >= 0; z--) {
      const slice = this.history[z]
      const depth = z / this.maxHistory // 0 = front, 1 = back

      // Perspective calculations
      const perspectiveFactor = 1 - depth * 0.6
      const yOffset = depth * height * 0.6
      const xMargin = depth * width * 0.15

      // Effective width and height for this depth level
      const effectiveWidth = width - xMargin * 2
      const maxHeight = height * 0.5 * perspectiveFactor

      // Color based on depth
      const lineColor = this.colorScheme === 'rainbow'
        ? `hsl(${(this.hue + z * 15) % 360}, 100%, ${70 - depth * 40}%)`
        : this.interpolateColor(scheme.near, scheme.far, depth)

      const fillColor = this.colorScheme === 'rainbow'
        ? `hsla(${(this.hue + z * 15) % 360}, 80%, ${30 - depth * 20}%, ${0.8 - depth * 0.5})`
        : this.interpolateColor(scheme.fill, scheme.far, depth)

      // Draw filled shape
      this.ctx.beginPath()
      this.ctx.moveTo(xMargin, height - yOffset)

      for (let i = 0; i < slice.length; i++) {
        const x = xMargin + (i / (slice.length - 1)) * effectiveWidth
        const barHeight = slice[i] * maxHeight
        const y = height - yOffset - barHeight

        this.ctx.lineTo(x, y)
      }

      this.ctx.lineTo(width - xMargin, height - yOffset)
      this.ctx.closePath()

      this.ctx.fillStyle = fillColor
      this.ctx.fill()

      // Draw line on top for nearest slices
      if (z < 8) {
        this.ctx.beginPath()
        for (let i = 0; i < slice.length; i++) {
          const x = xMargin + (i / (slice.length - 1)) * effectiveWidth
          const barHeight = slice[i] * maxHeight
          const y = height - yOffset - barHeight

          if (i === 0) {
            this.ctx.moveTo(x, y)
          } else {
            this.ctx.lineTo(x, y)
          }
        }

        this.ctx.strokeStyle = lineColor
        this.ctx.lineWidth = Math.max(1, 2 - z * 0.2)

        if (z === 0) {
          this.ctx.shadowBlur = 10
          this.ctx.shadowColor = lineColor
        }

        this.ctx.stroke()
        this.ctx.shadowBlur = 0
      }
    }

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
