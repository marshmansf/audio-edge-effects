/**
 * Waveform Phase Visualizer
 * Shows phase relationship between frequency bands as interweaving sine waves
 */

import { AnimationController } from '../utils/animation-controller'

export interface WaveformPhaseOptions {
  container: HTMLElement
  colorScheme?: string
  bandCount?: number
}

const colorSchemes: Record<string, string[]> = {
  classic: ['#00ff00', '#44ff44', '#88ff88', '#00cc00', '#008800'],
  blue: ['#0066ff', '#0099ff', '#00ccff', '#00ddff', '#00eeff'],
  purple: ['#6600ff', '#8800ff', '#aa00ff', '#cc00ff', '#ee00ff'],
  fire: ['#ff0000', '#ff3300', '#ff6600', '#ff9900', '#ffcc00'],
  ice: ['#0044ff', '#0088ff', '#00ccff', '#00ffff', '#aaffff'],
  light: ['#ffffff', '#eeeeee', '#dddddd', '#cccccc', '#bbbbbb'],
  dark: ['#1a3a5e', '#2a4a6e', '#3a5a7e', '#4a6a8e', '#5a7a9e'],
  rainbow: ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#ff00ff']
}

interface Band {
  energy: number
  phase: number
  frequency: number
}

export class WaveformPhaseVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationController: AnimationController | null = null
  private colorScheme: string
  private bandCount: number
  private bands: Band[] = []
  private time: number = 0
  private hue: number = 0

  constructor(options: WaveformPhaseOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.bandCount = options.bandCount || 5

    // Initialize bands with different base frequencies
    for (let i = 0; i < this.bandCount; i++) {
      this.bands.push({
        energy: 0,
        phase: (i / this.bandCount) * Math.PI * 2,
        frequency: 1 + i * 0.5
      })
    }

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

    this.ctx.clearRect(0, 0, width, height)

    const colors = colorSchemes[this.colorScheme] || colorSchemes.classic
    const binSize = Math.floor(this.dataArray.length / this.bandCount)

    // Update band energies from frequency data
    for (let i = 0; i < this.bandCount; i++) {
      let sum = 0
      for (let j = 0; j < binSize; j++) {
        sum += this.dataArray[i * binSize + j]
      }
      const targetEnergy = sum / binSize / 255
      // Smooth energy transitions
      this.bands[i].energy += (targetEnergy - this.bands[i].energy) * 0.3
    }

    // Draw each band as a sine wave
    for (let b = 0; b < this.bandCount; b++) {
      const band = this.bands[b]
      const color = this.colorScheme === 'rainbow'
        ? `hsl(${(this.hue + b * 60) % 360}, 100%, 60%)`
        : colors[b % colors.length]

      this.ctx.beginPath()
      this.ctx.strokeStyle = color
      this.ctx.lineWidth = 2 + band.energy * 2
      this.ctx.globalAlpha = 0.5 + band.energy * 0.5
      this.ctx.shadowBlur = 10 + band.energy * 15
      this.ctx.shadowColor = color

      const amplitude = height * 0.3 * (0.3 + band.energy * 0.7)
      const baseY = height / 2

      for (let x = 0; x < width; x++) {
        const progress = x / width
        const wavePhase = this.time * band.frequency + band.phase + progress * Math.PI * 4

        // Combine multiple harmonics for more interesting waves
        const y = baseY +
          Math.sin(wavePhase) * amplitude * 0.6 +
          Math.sin(wavePhase * 2 + band.phase) * amplitude * 0.25 +
          Math.sin(wavePhase * 3 - band.phase) * amplitude * 0.15

        if (x === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }

      this.ctx.stroke()
    }

    this.ctx.globalAlpha = 1
    this.ctx.shadowBlur = 0

    this.time += 0.05
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
