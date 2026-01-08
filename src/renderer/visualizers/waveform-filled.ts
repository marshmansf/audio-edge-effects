/**
 * Waveform Filled Visualizer
 * Symmetric waveform that mirrors above/below baseline creating ribbon effect
 */

import { AnimationController } from '../utils/animation-controller'

export interface WaveformFilledOptions {
  container: HTMLElement
  colorScheme?: string
}

// Color schemes
const colorSchemes: Record<string, { stroke: string, fill: string }> = {
  classic: { stroke: '#00ff00', fill: '#00ff0044' },
  blue: { stroke: '#00ccff', fill: '#00ccff44' },
  purple: { stroke: '#cc00ff', fill: '#cc00ff44' },
  fire: { stroke: '#ff6600', fill: '#ff660044' },
  ice: { stroke: '#00ffff', fill: '#00ffff44' },
  light: { stroke: '#ffffff', fill: '#ffffff44' },
  dark: { stroke: '#4a7a9e', fill: '#4a7a9e44' },
  rainbow: { stroke: '#ff00ff', fill: '#ff00ff44' }
}

export class WaveformFilledVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationController: AnimationController | null = null
  private colorScheme: string

  constructor(options: WaveformFilledOptions) {
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

    this.analyser.getByteTimeDomainData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height)

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic
    const baseline = height - 1 // At screen edge
    const sliceWidth = width / this.dataArray.length
    const amplitude = height * 3 // 3x magnitude

    // Build upper and lower waveform points
    const upperPoints: { x: number, y: number }[] = []
    const lowerPoints: { x: number, y: number }[] = []
    let x = 0

    for (let i = 0; i < this.dataArray.length; i++) {
      const v = this.dataArray[i] / 128.0
      const deviation = Math.abs(v - 1) // Absolute deviation for mirror
      const offset = deviation * amplitude

      upperPoints.push({ x, y: baseline - offset })
      lowerPoints.push({ x, y: baseline + offset })
      x += sliceWidth
    }

    // Draw filled area between upper and lower waves
    this.ctx.beginPath()
    this.ctx.moveTo(upperPoints[0].x, upperPoints[0].y)

    // Upper edge
    for (let i = 1; i < upperPoints.length; i++) {
      this.ctx.lineTo(upperPoints[i].x, upperPoints[i].y)
    }

    // Connect to lower edge (reverse direction)
    for (let i = lowerPoints.length - 1; i >= 0; i--) {
      this.ctx.lineTo(lowerPoints[i].x, lowerPoints[i].y)
    }

    this.ctx.closePath()
    this.ctx.fillStyle = scheme.fill
    this.ctx.fill()

    // Draw upper waveform line with glow
    this.ctx.save()
    this.ctx.shadowBlur = 15
    this.ctx.shadowColor = scheme.stroke
    this.ctx.strokeStyle = scheme.stroke
    this.ctx.lineWidth = 2
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'

    this.ctx.beginPath()
    for (let i = 0; i < upperPoints.length; i++) {
      if (i === 0) {
        this.ctx.moveTo(upperPoints[i].x, upperPoints[i].y)
      } else {
        this.ctx.lineTo(upperPoints[i].x, upperPoints[i].y)
      }
    }
    this.ctx.stroke()

    // Draw lower waveform line with glow
    this.ctx.beginPath()
    for (let i = 0; i < lowerPoints.length; i++) {
      if (i === 0) {
        this.ctx.moveTo(lowerPoints[i].x, lowerPoints[i].y)
      } else {
        this.ctx.lineTo(lowerPoints[i].x, lowerPoints[i].y)
      }
    }
    this.ctx.stroke()
    this.ctx.restore()
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
