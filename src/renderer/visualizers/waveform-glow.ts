/**
 * Waveform Glow Visualizer
 * Thick glowing neon-tube style waveform with intense blur effect
 */

import { AnimationController } from '../utils/animation-controller'

export interface WaveformGlowOptions {
  container: HTMLElement
  colorScheme?: string
}

// Color schemes
const colorSchemes: Record<string, { stroke: string, glow: string }> = {
  classic: { stroke: '#00ff00', glow: '#00ff00' },
  blue: { stroke: '#00ccff', glow: '#0088ff' },
  purple: { stroke: '#cc00ff', glow: '#8800cc' },
  fire: { stroke: '#ff6600', glow: '#ff3300' },
  ice: { stroke: '#ffffff', glow: '#00ccff' },
  light: { stroke: '#ffffff', glow: '#ffffff' },
  dark: { stroke: '#4a7a9e', glow: '#0f3460' },
  rainbow: { stroke: '#ff00ff', glow: '#00ffff' }
}

export class WaveformGlowVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationController: AnimationController | null = null
  private colorScheme: string

  constructor(options: WaveformGlowOptions) {
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
    const baseline = height - 1
    const sliceWidth = width / this.dataArray.length

    // Build the path once
    const points: { x: number, y: number }[] = []
    let x = 0

    for (let i = 0; i < this.dataArray.length; i++) {
      const v = this.dataArray[i] / 128.0
      const deviation = v - 1
      const y = baseline - (deviation * (height - 1) * 3)
      points.push({ x, y })
      x += sliceWidth
    }

    // Draw multiple layers for intense glow effect
    // Layer 1: Outermost glow (very blurry, wide)
    this.ctx.save()
    this.ctx.shadowBlur = 50
    this.ctx.shadowColor = scheme.glow
    this.ctx.strokeStyle = scheme.glow
    this.ctx.lineWidth = 20
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.ctx.globalAlpha = 0.3
    this.drawPath(points)
    this.ctx.restore()

    // Layer 2: Mid glow
    this.ctx.save()
    this.ctx.shadowBlur = 30
    this.ctx.shadowColor = scheme.glow
    this.ctx.strokeStyle = scheme.glow
    this.ctx.lineWidth = 12
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.ctx.globalAlpha = 0.5
    this.drawPath(points)
    this.ctx.restore()

    // Layer 3: Inner glow
    this.ctx.save()
    this.ctx.shadowBlur = 20
    this.ctx.shadowColor = scheme.stroke
    this.ctx.strokeStyle = scheme.stroke
    this.ctx.lineWidth = 6
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.ctx.globalAlpha = 0.7
    this.drawPath(points)
    this.ctx.restore()

    // Layer 4: Core line (bright center)
    this.ctx.save()
    this.ctx.shadowBlur = 10
    this.ctx.shadowColor = '#ffffff'
    this.ctx.strokeStyle = '#ffffff'
    this.ctx.lineWidth = 2
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.ctx.globalAlpha = 0.9
    this.drawPath(points)
    this.ctx.restore()
  }

  private drawPath(points: { x: number, y: number }[]): void {
    this.ctx.beginPath()
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        this.ctx.moveTo(points[i].x, points[i].y)
      } else {
        this.ctx.lineTo(points[i].x, points[i].y)
      }
    }
    this.ctx.stroke()
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
