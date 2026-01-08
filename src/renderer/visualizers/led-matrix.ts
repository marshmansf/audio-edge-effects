/**
 * LED Matrix Visualizer
 * Dot-matrix LED display showing pixelated spectrum
 */

import { AnimationController } from '../utils/animation-controller'

export interface LedMatrixOptions {
  container: HTMLElement
  colorScheme?: string
  cols?: number
  rows?: number
}

const colorSchemes: Record<string, { on: string, dim: string, off: string }> = {
  classic: { on: '#00ff00', dim: '#004400', off: '#001100' },
  blue: { on: '#00ccff', dim: '#003344', off: '#001122' },
  purple: { on: '#cc00ff', dim: '#330044', off: '#110022' },
  fire: { on: '#ff6600', dim: '#331100', off: '#110500' },
  ice: { on: '#00ffff', dim: '#003333', off: '#001111' },
  light: { on: '#ffffff', dim: '#444444', off: '#222222' },
  dark: { on: '#4a7a9e', dim: '#1a3a5e', off: '#0a1a2e' },
  rainbow: { on: '#ffffff', dim: '#333333', off: '#111111' }
}

export class LedMatrixVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationController: AnimationController | null = null
  private colorScheme: string
  private cols: number = 32
  private targetCols: number | null = null
  private rows: number
  private peakRows: number[] = []
  private hue: number = 0
  private ledSize: number = 8

  constructor(options: LedMatrixOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.targetCols = options.cols || null
    this.rows = options.rows || 8

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private handleResize(): void {
    const parent = this.canvas.parentElement
    if (parent) {
      this.canvas.width = parent.offsetWidth * window.devicePixelRatio
      this.canvas.height = parent.offsetHeight * window.devicePixelRatio
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

      const width = parent.offsetWidth
      const height = parent.offsetHeight
      const padding = 2

      if (this.targetCols) {
        // Use specified column count from density setting
        this.cols = this.targetCols
        // Calculate LED size to fit the specified columns
        this.ledSize = Math.min(
          (width - padding * (this.cols + 1)) / this.cols,
          (height - padding * (this.rows + 1)) / this.rows
        )
      } else {
        // Calculate optimal LED size based on rows, then fill width
        this.ledSize = (height - padding * (this.rows + 1)) / this.rows
        this.cols = Math.floor((width - padding) / (this.ledSize + padding))
      }

      // Reinitialize peak tracking
      this.peakRows = new Array(this.cols).fill(0)
    }
  }

  init(analyser: AnalyserNode): void {
    this.analyser = analyser
    this.dataArray = new Uint8Array(analyser.frequencyBinCount)
    this.animationController = new AnimationController(() => this.draw())
    this.animationController.start()
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Calculate LED dimensions with padding
    const padding = 2
    const ledSize = this.ledSize
    const ledRadius = ledSize * 0.4

    // Start from left edge, span full width
    // Pin to bottom edge (screen edge) instead of centering vertically
    const offsetX = padding
    const totalLedHeight = this.rows * ledSize + (this.rows + 1) * padding
    const offsetY = height - totalLedHeight

    // Clear canvas with transparency
    this.ctx.clearRect(0, 0, width, height)

    // Sample frequency data for each column
    const binSize = Math.floor(this.dataArray.length / this.cols)

    for (let col = 0; col < this.cols; col++) {
      // Average energy for this column
      let energy = 0
      for (let i = 0; i < binSize; i++) {
        energy += this.dataArray[col * binSize + i]
      }
      energy = energy / binSize / 255

      // How many rows to light up
      const litRows = Math.floor(energy * this.rows)

      // Update peak
      if (litRows >= this.peakRows[col]) {
        this.peakRows[col] = litRows
      } else {
        this.peakRows[col] = Math.max(0, this.peakRows[col] - 0.1)
      }

      for (let row = 0; row < this.rows; row++) {
        const x = offsetX + padding + col * (ledSize + padding) + ledSize / 2
        const y = offsetY + padding + (this.rows - 1 - row) * (ledSize + padding) + ledSize / 2

        // Determine LED state
        const isLit = row < litRows
        const isPeak = Math.floor(this.peakRows[col]) === row && this.peakRows[col] > 0

        // Only draw lit LEDs and peaks (transparent background)
        if (isLit || isPeak) {
          // Draw LED
          this.ctx.beginPath()
          this.ctx.arc(x, y, ledRadius, 0, Math.PI * 2)

          if (this.colorScheme === 'rainbow') {
            const hue = (this.hue + col * 10) % 360
            const lightness = isPeak ? 70 : (50 + row * 5)
            this.ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`
            this.ctx.shadowColor = `hsl(${hue}, 100%, 60%)`
          } else {
            this.ctx.fillStyle = scheme.on
            this.ctx.shadowColor = scheme.on
          }
          this.ctx.shadowBlur = isPeak ? 15 : 10

          this.ctx.fill()

          // Add inner glow for lit LEDs
          if (isLit) {
            this.ctx.beginPath()
            this.ctx.arc(x - ledRadius * 0.2, y - ledRadius * 0.2, ledRadius * 0.3, 0, Math.PI * 2)
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
            this.ctx.shadowBlur = 0
            this.ctx.fill()
          }
        }
      }
    }

    this.ctx.shadowBlur = 0
    this.hue = (this.hue + 0.5) % 360
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
