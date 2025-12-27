/**
 * Frequency Terrain Visualizer
 * Pseudo-3D scrolling terrain/mountain range
 * Frequency data as height map with multiple depth layers
 */

export interface TerrainOptions {
  container: HTMLElement
  colorScheme?: string
}

// Color schemes with near/far colors for depth
const colorSchemes: Record<string, { near: string, far: string, line: string }> = {
  classic: { near: '#00ff00', far: '#003300', line: '#00ff00' },
  blue: { near: '#00ccff', far: '#001133', line: '#00ccff' },
  purple: { near: '#cc00ff', far: '#220033', line: '#cc00ff' },
  fire: { near: '#ffcc00', far: '#331100', line: '#ff6600' },
  ice: { near: '#ffffff', far: '#001122', line: '#00ccff' },
  light: { near: '#ffffff', far: '#333333', line: '#ffffff' },
  dark: { near: '#4a7a9e', far: '#0a1a2e', line: '#2a5a7e' },
  rainbow: { near: '#ff00ff', far: '#000033', line: '#00ffff' }
}

export class TerrainVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private history: number[][] = []
  private maxHistory: number = 30
  private hue: number = 0

  constructor(options: TerrainOptions) {
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
    this.draw()
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height)

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Sample frequency data to create current terrain slice
    const sliceResolution = 64
    const currentSlice: number[] = []

    for (let i = 0; i < sliceResolution; i++) {
      const binIndex = Math.floor((i / sliceResolution) * this.dataArray.length * 0.5) // Use lower half of spectrum
      currentSlice.push(this.dataArray[binIndex] / 255)
    }

    // Add to history (newest at front)
    this.history.unshift(currentSlice)
    if (this.history.length > this.maxHistory) {
      this.history.pop()
    }

    // Draw terrain from back to front (oldest to newest)
    for (let z = this.history.length - 1; z >= 0; z--) {
      const slice = this.history[z]
      const depthProgress = z / this.maxHistory // 0 = near, 1 = far

      // Perspective: far slices are higher on screen and smaller
      const horizonY = height * 0.2
      const baseY = height - 1
      const sliceY = baseY - (baseY - horizonY) * (1 - depthProgress)

      // Perspective scale (smaller = farther)
      const scale = 0.3 + (1 - depthProgress) * 0.7

      // Calculate heights with perspective
      const maxHeight = height * 0.6 * scale

      // Draw filled terrain polygon
      this.ctx.beginPath()

      // Start at left edge
      this.ctx.moveTo(0, sliceY)

      // Draw mountain profile
      for (let i = 0; i < slice.length; i++) {
        const x = (i / (slice.length - 1)) * width
        const heightValue = slice[i]
        const y = sliceY - heightValue * maxHeight

        this.ctx.lineTo(x, y)
      }

      // Complete the shape
      this.ctx.lineTo(width, sliceY)
      this.ctx.closePath()

      // Fill with depth-based color
      const alpha = 0.3 + (1 - depthProgress) * 0.5

      if (this.colorScheme === 'rainbow') {
        const hue = (this.hue + z * 10) % 360
        this.ctx.fillStyle = `hsla(${hue}, 70%, ${20 + (1 - depthProgress) * 30}%, ${alpha})`
      } else {
        this.ctx.fillStyle = this.interpolateColor(scheme.far, scheme.near, 1 - depthProgress, alpha)
      }
      this.ctx.fill()

      // Draw edge line for nearest slices only
      if (z < 5) {
        this.ctx.beginPath()
        for (let i = 0; i < slice.length; i++) {
          const x = (i / (slice.length - 1)) * width
          const heightValue = slice[i]
          const y = sliceY - heightValue * maxHeight

          if (i === 0) {
            this.ctx.moveTo(x, y)
          } else {
            this.ctx.lineTo(x, y)
          }
        }

        const lineAlpha = (1 - z / 5) * 0.8
        this.ctx.strokeStyle = this.colorScheme === 'rainbow'
          ? `hsla(${(this.hue + z * 10) % 360}, 100%, 60%, ${lineAlpha})`
          : this.hexToRgba(scheme.line, lineAlpha)
        this.ctx.lineWidth = 1.5 - z * 0.2
        this.ctx.shadowBlur = z === 0 ? 8 : 0
        this.ctx.shadowColor = scheme.line
        this.ctx.stroke()
      }
    }

    this.ctx.shadowBlur = 0
    this.hue = (this.hue + 1) % 360
  }

  private interpolateColor(color1: string, color2: string, factor: number, alpha: number): string {
    const c1 = this.hexToRgb(color1)
    const c2 = this.hexToRgb(color2)

    const r = Math.round(c1.r + (c2.r - c1.r) * factor)
    const g = Math.round(c1.g + (c2.g - c1.g) * factor)
    const b = Math.round(c1.b + (c2.b - c1.b) * factor)

    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const { r, g, b } = this.hexToRgb(hex)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
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
