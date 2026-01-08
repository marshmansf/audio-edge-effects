/**
 * Spectrum Cells Visualizer
 * Classic WinAmp-style LED cells with green/yellow/red gradient and peak indicators
 */

import { AnimationController } from '../utils/animation-controller'

export interface SpectrumCellsOptions {
  container: HTMLElement
  barCount?: number
  colorScheme?: string
}

// Color schemes for cells
const colorSchemes: Record<string, { colors: string[], peakColor: string }> = {
  classic: {
    colors: ['#00ff00', '#00ff00', '#00ff00', '#00ff00', '#00ff00', '#00ff00',
             '#ffff00', '#ffff00', '#ffff00', '#ff0000'],
    peakColor: '#ff0000'
  },
  blue: {
    colors: ['#0066ff', '#0066ff', '#0066ff', '#0066ff', '#0066ff', '#0066ff',
             '#00ccff', '#00ccff', '#00ccff', '#ffffff'],
    peakColor: '#ffffff'
  },
  purple: {
    colors: ['#6600ff', '#6600ff', '#6600ff', '#6600ff', '#6600ff', '#6600ff',
             '#cc00ff', '#cc00ff', '#cc00ff', '#ff00cc'],
    peakColor: '#ff00cc'
  },
  fire: {
    colors: ['#ff0000', '#ff0000', '#ff0000', '#ff0000', '#ff3300', '#ff3300',
             '#ff6600', '#ff6600', '#ffcc00', '#ffff00'],
    peakColor: '#ffff00'
  },
  ice: {
    colors: ['#0099ff', '#0099ff', '#0099ff', '#0099ff', '#00ccff', '#00ccff',
             '#00ffff', '#00ffff', '#ffffff', '#ffffff'],
    peakColor: '#ffffff'
  },
  light: {
    colors: ['#999999', '#999999', '#999999', '#999999', '#aaaaaa', '#aaaaaa',
             '#cccccc', '#cccccc', '#eeeeee', '#ffffff'],
    peakColor: '#ffffff'
  },
  dark: {
    colors: ['#1a1a2e', '#1a1a2e', '#1a1a2e', '#1a1a2e', '#16213e', '#16213e',
             '#0f3460', '#0f3460', '#1a4a6e', '#2a5a7e'],
    peakColor: '#4a7a9e'
  },
  rainbow: {
    colors: ['#ff0000', '#ff4400', '#ff8800', '#ffcc00', '#88ff00', '#00ff00',
             '#00ff88', '#00ffff', '#0088ff', '#ff00ff'],
    peakColor: '#ffffff'
  }
}

export class SpectrumCellsVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationController: AnimationController | null = null
  private barCount: number
  private colorScheme: string
  private peaks: number[] = []
  private peakDecay: number[] = []

  constructor(options: SpectrumCellsOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.barCount = options.barCount || 32
    this.colorScheme = options.colorScheme || 'classic'
    this.peaks = new Array(this.barCount).fill(0)
    this.peakDecay = new Array(this.barCount).fill(0)

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
    this.animationController = new AnimationController(() => this.draw())
    this.animationController.start()
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height)

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic
    // Scale cell rows based on density: 10 rows at low density, up to 40 rows at max
    const cellRows = Math.max(10, Math.round(this.barCount / 19))
    const barGap = 2
    const cellGap = 1
    const barWidth = (width - (this.barCount - 1) * barGap) / this.barCount
    const cellHeight = (height - (cellRows - 1) * cellGap) / cellRows

    // Sample frequency data for each bar
    const binSize = Math.floor(this.dataArray.length / this.barCount)

    for (let i = 0; i < this.barCount; i++) {
      // Average the frequency bins for this bar
      let sum = 0
      for (let j = 0; j < binSize; j++) {
        sum += this.dataArray[i * binSize + j]
      }
      const value = sum / binSize / 255 // Normalize to 0-1

      // Calculate how many cells to light up
      const litCells = Math.floor(value * cellRows)

      // Update peak
      if (litCells > this.peaks[i]) {
        this.peaks[i] = litCells
        this.peakDecay[i] = 0
      } else {
        this.peakDecay[i]++
        if (this.peakDecay[i] > 15) { // Hold for 15 frames then decay
          this.peaks[i] = Math.max(0, this.peaks[i] - 0.2)
        }
      }

      const x = i * (barWidth + barGap)

      // Draw cells from bottom to top
      for (let row = 0; row < cellRows; row++) {
        const y = height - (row + 1) * (cellHeight + cellGap)
        const colorIndex = Math.floor((row / cellRows) * scheme.colors.length)

        if (row < litCells) {
          // Lit cell
          this.ctx.fillStyle = scheme.colors[colorIndex]
          this.ctx.fillRect(x, y, barWidth, cellHeight)
        }
      }

      // Draw peak indicator
      if (this.peaks[i] > 0) {
        const peakRow = Math.floor(this.peaks[i])
        if (peakRow < cellRows) {
          const peakY = height - (peakRow + 1) * (cellHeight + cellGap)
          this.ctx.fillStyle = scheme.peakColor
          this.ctx.fillRect(x, peakY, barWidth, cellHeight)
        }
      }
    }
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
