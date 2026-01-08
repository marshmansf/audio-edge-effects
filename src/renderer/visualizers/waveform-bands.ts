/**
 * Waveform Bands Visualizer
 * Multiple layered waveform lines creating a flowing ribbon effect
 */

import { AnimationController } from '../utils/animation-controller'

export interface WaveformBandsOptions {
  container: HTMLElement
  colorScheme?: string
  bandCount?: number
}

// Color schemes with gradient colors for bands
const colorSchemes: Record<string, { start: string, end: string }> = {
  classic: { start: '#00ff00', end: '#88ff00' },
  blue: { start: '#0066ff', end: '#00ccff' },
  purple: { start: '#ff00ff', end: '#00ccff' },
  fire: { start: '#ff0000', end: '#ffcc00' },
  ice: { start: '#0099ff', end: '#ffffff' },
  light: { start: '#cccccc', end: '#ffffff' },
  dark: { start: '#0f3460', end: '#1a4a6e' },
  rainbow: { start: '#ff00ff', end: '#00ffff' }
}

export class WaveformBandsVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationController: AnimationController | null = null
  private colorScheme: string
  private bandCount: number
  private phase: number = 0

  constructor(options: WaveformBandsOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'purple'
    this.bandCount = options.bandCount || 40

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

  private interpolateColor(color1: string, color2: string, factor: number): string {
    // Parse hex colors
    const r1 = parseInt(color1.slice(1, 3), 16)
    const g1 = parseInt(color1.slice(3, 5), 16)
    const b1 = parseInt(color1.slice(5, 7), 16)
    const r2 = parseInt(color2.slice(1, 3), 16)
    const g2 = parseInt(color2.slice(3, 5), 16)
    const b2 = parseInt(color2.slice(5, 7), 16)

    const r = Math.round(r1 + (r2 - r1) * factor)
    const g = Math.round(g1 + (g2 - g1) * factor)
    const b = Math.round(b1 + (b2 - b1) * factor)

    return `rgb(${r}, ${g}, ${b})`
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.analyser.getByteTimeDomainData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height)

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.purple
    // Position baseline halfway off the screen edge
    const baseline = height + (height * 0.4)
    const sliceWidth = width / this.dataArray.length

    // Increment phase for subtle animation
    this.phase += 0.02

    // Draw multiple bands with phase offsets
    for (let band = 0; band < this.bandCount; band++) {
      const bandProgress = band / (this.bandCount - 1)

      // Alternate colors - bands oscillate between start and end colors
      const colorFactor = Math.abs(Math.sin(bandProgress * Math.PI + this.phase))
      const color = this.interpolateColor(scheme.start, scheme.end, colorFactor)

      // Calculate vertical offset for this band
      // Creates a ribbon-like spread upward from baseline
      const spreadFactor = band / this.bandCount
      const maxSpread = height * 0.8
      const baseOffset = spreadFactor * maxSpread

      this.ctx.beginPath()
      this.ctx.strokeStyle = color
      this.ctx.lineWidth = 1
      this.ctx.globalAlpha = 0.7 - spreadFactor * 0.5

      let x = 0
      for (let i = 0; i < this.dataArray.length; i++) {
        const v = this.dataArray[i] / 128.0
        const deviation = v - 1

        // Apply waveform deviation with band-specific offset
        // Each band follows the waveform but is offset vertically from baseline
        const waveOffset = deviation * height * 3
        const y = baseline - baseOffset + waveOffset * (1 - spreadFactor * 0.3)

        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }

        x += sliceWidth
      }

      this.ctx.stroke()
    }

    // Reset alpha
    this.ctx.globalAlpha = 1
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
