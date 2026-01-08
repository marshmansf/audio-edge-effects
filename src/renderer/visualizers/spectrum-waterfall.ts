/**
 * Spectrum Waterfall Visualizer
 * Cascading horizontal bars that rise like steam
 * Newest at bottom, pushing older rows up
 */

import { AnimationController } from '../utils/animation-controller'

export interface SpectrumWaterfallOptions {
  container: HTMLElement
  colorScheme?: string
  resolution?: number
}

const colorSchemes: Record<string, { low: string, mid: string, high: string }> = {
  classic: { low: '#003300', mid: '#00aa00', high: '#00ff00' },
  blue: { low: '#000033', mid: '#0066cc', high: '#00ccff' },
  purple: { low: '#110022', mid: '#6600aa', high: '#cc00ff' },
  fire: { low: '#220000', mid: '#aa3300', high: '#ffcc00' },
  ice: { low: '#001133', mid: '#0066aa', high: '#aaffff' },
  light: { low: '#333333', mid: '#888888', high: '#ffffff' },
  dark: { low: '#050a10', mid: '#1a3050', high: '#3a5a7e' },
  rainbow: { low: '#000000', mid: '#444444', high: '#ffffff' }
}

export class SpectrumWaterfallVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationController: AnimationController | null = null
  private colorScheme: string
  private history: number[][] = []
  private maxHistory: number = 60
  private resolution: number
  private hue: number = 0

  constructor(options: SpectrumWaterfallOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.resolution = options.resolution || 128

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
    this.history = []
    this.animationController = new AnimationController(() => this.draw())
    this.animationController.start()
  }

  private getColor(value: number, rowIndex: number): string {
    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic
    const age = rowIndex / this.maxHistory

    if (this.colorScheme === 'rainbow') {
      const hue = (this.hue + value * 120) % 360
      const lightness = 20 + value * 50
      const alpha = 1 - age * 0.7
      return `hsla(${hue}, 100%, ${lightness}%, ${alpha})`
    }

    // Interpolate between low, mid, high based on value
    const alpha = 1 - age * 0.7

    if (value < 0.33) {
      return this.interpolateColor(scheme.low, scheme.mid, value * 3, alpha)
    } else if (value < 0.66) {
      return this.interpolateColor(scheme.mid, scheme.high, (value - 0.33) * 3, alpha)
    } else {
      return this.hexToRgba(scheme.high, alpha)
    }
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

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    this.ctx.clearRect(0, 0, width, height)

    // Sample frequency data
    const currentRow: number[] = []
    const binSize = Math.floor(this.dataArray.length / this.resolution)

    for (let i = 0; i < this.resolution; i++) {
      let sum = 0
      for (let j = 0; j < binSize; j++) {
        sum += this.dataArray[i * binSize + j]
      }
      currentRow.push(sum / binSize / 255)
    }

    // Add to history
    this.history.unshift(currentRow)
    if (this.history.length > this.maxHistory) {
      this.history.pop()
    }

    const rowHeight = height / this.maxHistory
    const barWidth = width / this.resolution

    // Draw rows from newest (bottom) to oldest (top)
    for (let row = 0; row < this.history.length; row++) {
      const rowData = this.history[row]
      const y = height - (row + 1) * rowHeight

      for (let col = 0; col < rowData.length; col++) {
        const value = rowData[col]
        if (value < 0.05) continue // Skip very quiet

        const x = col * barWidth

        this.ctx.fillStyle = this.getColor(value, row)

        // Add glow for high values on recent rows
        if (row < 5 && value > 0.5) {
          this.ctx.shadowBlur = 10
          this.ctx.shadowColor = this.getColor(value, 0)
        } else {
          this.ctx.shadowBlur = 0
        }

        this.ctx.fillRect(x, y, barWidth - 1, rowHeight - 1)
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
