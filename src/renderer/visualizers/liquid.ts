/**
 * Liquid Visualizer
 * Simple fluid simulation where bass creates ripples/waves that propagate
 */

import { AnimationController } from '../utils/animation-controller'

export interface LiquidOptions {
  container: HTMLElement
  colorScheme?: string
  resolution?: number
}

const colorSchemes: Record<string, { surface: string, deep: string, highlight: string }> = {
  classic: { surface: '#00ff00', deep: '#003300', highlight: '#88ff88' },
  blue: { surface: '#00aaff', deep: '#001144', highlight: '#88ddff' },
  purple: { surface: '#aa00ff', deep: '#220044', highlight: '#dd88ff' },
  fire: { surface: '#ff6600', deep: '#331100', highlight: '#ffaa44' },
  ice: { surface: '#00ccff', deep: '#001133', highlight: '#aaffff' },
  light: { surface: '#cccccc', deep: '#333333', highlight: '#ffffff' },
  dark: { surface: '#3a5a7e', deep: '#0a1a2e', highlight: '#5a7a9e' },
  rainbow: { surface: '#00ffff', deep: '#000033', highlight: '#ffffff' }
}

export class LiquidVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationController: AnimationController | null = null
  private colorScheme: string
  private heightMap: number[] = []
  private velocityMap: number[] = []
  private resolution: number = 100
  private damping: number = 0.97
  private tension: number = 0.03
  private spread: number = 0.3
  private lastBassEnergy: number = 0
  private hue: number = 0

  constructor(options: LiquidOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'blue'
    this.resolution = options.resolution || 100

    this.initWater()

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private initWater(): void {
    this.heightMap = new Array(this.resolution).fill(0)
    this.velocityMap = new Array(this.resolution).fill(0)
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

  private createSplash(position: number, force: number): void {
    const index = Math.floor(position * this.resolution)
    if (index >= 0 && index < this.resolution) {
      this.velocityMap[index] -= force
    }
  }

  private simulateWater(): void {
    // Apply spring physics to each column
    for (let i = 0; i < this.resolution; i++) {
      // Acceleration based on height difference from rest
      const acceleration = -this.tension * this.heightMap[i]
      this.velocityMap[i] += acceleration
      this.velocityMap[i] *= this.damping
    }

    // Update heights
    for (let i = 0; i < this.resolution; i++) {
      this.heightMap[i] += this.velocityMap[i]
    }

    // Propagate waves to neighbors
    const leftDeltas: number[] = new Array(this.resolution).fill(0)
    const rightDeltas: number[] = new Array(this.resolution).fill(0)

    for (let i = 0; i < this.resolution; i++) {
      if (i > 0) {
        leftDeltas[i] = this.spread * (this.heightMap[i] - this.heightMap[i - 1])
        this.velocityMap[i - 1] += leftDeltas[i]
      }
      if (i < this.resolution - 1) {
        rightDeltas[i] = this.spread * (this.heightMap[i] - this.heightMap[i + 1])
        this.velocityMap[i + 1] += rightDeltas[i]
      }
    }

    // Apply deltas
    for (let i = 0; i < this.resolution; i++) {
      if (i > 0) {
        this.heightMap[i - 1] += leftDeltas[i]
      }
      if (i < this.resolution - 1) {
        this.heightMap[i + 1] += rightDeltas[i]
      }
    }
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    this.ctx.clearRect(0, 0, width, height)

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.blue

    // Calculate bass energy
    const bassEnd = Math.floor(this.dataArray.length * 0.1)
    let bassEnergy = 0
    for (let i = 0; i < bassEnd; i++) {
      bassEnergy += this.dataArray[i]
    }
    bassEnergy = bassEnergy / bassEnd / 255

    // Create splashes on bass hits - reduced intensity by 25%
    if (bassEnergy > this.lastBassEnergy + 0.05 && bassEnergy > 0.15) {
      const splashPos = Math.random()
      const splashForce = bassEnergy * 37.5 // reduced from 50
      this.createSplash(splashPos, splashForce)

      // Add additional nearby splashes for bigger impact
      if (bassEnergy > 0.3) {
        this.createSplash(splashPos + 0.1, splashForce * 0.375) // reduced from 0.5
        this.createSplash(splashPos - 0.1, splashForce * 0.375)
      }
    }

    // Add continuous small waves based on mid frequencies
    const midStart = Math.floor(this.dataArray.length * 0.2)
    const midEnd = Math.floor(this.dataArray.length * 0.5)
    let midEnergy = 0
    for (let i = midStart; i < midEnd; i++) {
      midEnergy += this.dataArray[i]
    }
    midEnergy = midEnergy / (midEnd - midStart) / 255

    // More frequent continuous disturbances - lower threshold, reduced intensity
    if (midEnergy > 0.1) {
      const pos = Math.random()
      this.createSplash(pos, midEnergy * 9) // reduced from 12
    }

    // Add treble-reactive surface ripples - reduced intensity
    const trebleStart = Math.floor(this.dataArray.length * 0.5)
    let trebleEnergy = 0
    for (let i = trebleStart; i < this.dataArray.length; i++) {
      trebleEnergy += this.dataArray[i]
    }
    trebleEnergy = trebleEnergy / (this.dataArray.length - trebleStart) / 255

    if (trebleEnergy > 0.15 && Math.random() < trebleEnergy) {
      const pos = Math.random()
      this.createSplash(pos, trebleEnergy * 6) // reduced from 8
    }

    this.lastBassEnergy = bassEnergy * 0.7 + this.lastBassEnergy * 0.3

    // Simulate water physics
    this.simulateWater()

    // Draw water surface
    const baseY = height * 0.5
    const amplitude = height * 0.3

    // Draw deep water gradient
    const gradient = this.ctx.createLinearGradient(0, baseY, 0, height)
    if (this.colorScheme === 'rainbow') {
      gradient.addColorStop(0, `hsla(${this.hue}, 80%, 50%, 0.8)`)
      gradient.addColorStop(1, `hsla(${(this.hue + 60) % 360}, 80%, 20%, 0.9)`)
    } else {
      gradient.addColorStop(0, scheme.surface)
      gradient.addColorStop(1, scheme.deep)
    }

    // Draw water body
    this.ctx.beginPath()
    this.ctx.moveTo(0, height)

    for (let i = 0; i < this.resolution; i++) {
      const x = (i / (this.resolution - 1)) * width
      const y = baseY + this.heightMap[i] * amplitude

      if (i === 0) {
        this.ctx.lineTo(x, y)
      } else {
        // Smooth curve between points
        const prevX = ((i - 1) / (this.resolution - 1)) * width
        const prevY = baseY + this.heightMap[i - 1] * amplitude
        const cpX = (prevX + x) / 2
        this.ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2)
      }
    }

    this.ctx.lineTo(width, height)
    this.ctx.closePath()

    this.ctx.fillStyle = gradient
    this.ctx.fill()

    // Draw surface line with highlights
    this.ctx.beginPath()

    for (let i = 0; i < this.resolution; i++) {
      const x = (i / (this.resolution - 1)) * width
      const y = baseY + this.heightMap[i] * amplitude

      if (i === 0) {
        this.ctx.moveTo(x, y)
      } else {
        const prevX = ((i - 1) / (this.resolution - 1)) * width
        const prevY = baseY + this.heightMap[i - 1] * amplitude
        const cpX = (prevX + x) / 2
        this.ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2)
      }
    }

    if (this.colorScheme === 'rainbow') {
      this.ctx.strokeStyle = `hsl(${this.hue}, 100%, 70%)`
      this.ctx.shadowColor = `hsl(${this.hue}, 100%, 60%)`
    } else {
      this.ctx.strokeStyle = scheme.highlight
      this.ctx.shadowColor = scheme.surface
    }

    this.ctx.lineWidth = 3
    this.ctx.shadowBlur = 15
    this.ctx.stroke()

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
