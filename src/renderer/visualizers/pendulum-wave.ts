/**
 * Pendulum Wave Visualizer
 * Row of pendulums with different periods creating wave patterns
 * Audio affects swing amplitude
 */

import { AnimationController } from '../utils/animation-controller'

export interface PendulumWaveOptions {
  container: HTMLElement
  colorScheme?: string
  pendulumCount?: number
}

const colorSchemes: Record<string, { string: string, bob: string, trail: string }> = {
  classic: { string: '#004400', bob: '#00ff00', trail: '#00ff00' },
  blue: { string: '#001144', bob: '#00ccff', trail: '#00ccff' },
  purple: { string: '#220044', bob: '#cc00ff', trail: '#cc00ff' },
  fire: { string: '#221100', bob: '#ff6600', trail: '#ff6600' },
  ice: { string: '#112233', bob: '#00ffff', trail: '#00ffff' },
  light: { string: '#444444', bob: '#ffffff', trail: '#ffffff' },
  dark: { string: '#0a1a2e', bob: '#4a7a9e', trail: '#4a7a9e' },
  rainbow: { string: '#222222', bob: '#ffffff', trail: '#ffffff' }
}

interface Pendulum {
  angle: number
  angularVelocity: number
  length: number
  period: number
  trail: { x: number, y: number, age: number }[]
}

export class PendulumWaveVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationController: AnimationController | null = null
  private colorScheme: string
  private pendulums: Pendulum[] = []
  private pendulumCount: number
  private hue: number = 0
  private time: number = 0

  constructor(options: PendulumWaveOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.pendulumCount = options.pendulumCount || 15

    this.initPendulums()

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private initPendulums(): void {
    this.pendulums = []

    // Create pendulums with incrementing periods for wave effect
    const basePeriod = 60 // frames
    for (let i = 0; i < this.pendulumCount; i++) {
      // Each pendulum has a slightly longer period
      const period = basePeriod + i * 2

      this.pendulums.push({
        angle: 0,
        angularVelocity: 0,
        length: 0.8, // Relative to height
        period,
        trail: []
      })
    }
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

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Calculate energy per pendulum from frequency bands
    const bandSize = Math.floor(this.dataArray.length / this.pendulumCount)
    const energies: number[] = []

    for (let i = 0; i < this.pendulumCount; i++) {
      let sum = 0
      for (let j = 0; j < bandSize; j++) {
        sum += this.dataArray[i * bandSize + j]
      }
      energies.push(sum / bandSize / 255)
    }

    const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length
    const pivotY = 5
    const maxLength = height * 0.85
    const spacing = width / (this.pendulumCount + 1)

    // Update and draw each pendulum
    for (let i = 0; i < this.pendulums.length; i++) {
      const pendulum = this.pendulums[i]
      const energy = energies[i]
      const pivotX = spacing * (i + 1)

      // Calculate angle using simple harmonic motion
      // Angular frequency = 2π / period
      const omega = (2 * Math.PI) / pendulum.period
      const maxAmplitude = Math.PI / 4 * (0.3 + energy * 1.5)
      pendulum.angle = Math.sin(this.time * omega) * maxAmplitude

      // Calculate bob position
      const length = maxLength * pendulum.length
      const bobX = pivotX + Math.sin(pendulum.angle) * length
      const bobY = pivotY + Math.cos(pendulum.angle) * length
      const bobRadius = 6 + energy * 8

      // Add to trail
      pendulum.trail.push({ x: bobX, y: bobY, age: 0 })
      if (pendulum.trail.length > 30) {
        pendulum.trail.shift()
      }

      // Draw trail
      if (pendulum.trail.length > 1) {
        this.ctx.beginPath()
        this.ctx.moveTo(pendulum.trail[0].x, pendulum.trail[0].y)

        for (let j = 1; j < pendulum.trail.length; j++) {
          const point = pendulum.trail[j]
          this.ctx.lineTo(point.x, point.y)
          point.age++
        }

        const alpha = 0.3 + energy * 0.4
        if (this.colorScheme === 'rainbow') {
          this.ctx.strokeStyle = `hsla(${(this.hue + i * 20) % 360}, 100%, 60%, ${alpha})`
        } else {
          this.ctx.strokeStyle = scheme.trail
          this.ctx.globalAlpha = alpha
        }
        this.ctx.lineWidth = 2
        this.ctx.stroke()
        this.ctx.globalAlpha = 1
      }

      // Draw string
      this.ctx.beginPath()
      this.ctx.moveTo(pivotX, pivotY)
      this.ctx.lineTo(bobX, bobY)

      if (this.colorScheme === 'rainbow') {
        this.ctx.strokeStyle = `hsla(${(this.hue + i * 20) % 360}, 50%, 30%, 0.8)`
      } else {
        this.ctx.strokeStyle = scheme.string
      }
      this.ctx.lineWidth = 2
      this.ctx.stroke()

      // Draw pivot point
      this.ctx.beginPath()
      this.ctx.arc(pivotX, pivotY, 3, 0, Math.PI * 2)
      this.ctx.fillStyle = scheme.string
      this.ctx.fill()

      // Draw bob with glow
      this.ctx.beginPath()
      this.ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2)

      if (this.colorScheme === 'rainbow') {
        this.ctx.fillStyle = `hsl(${(this.hue + i * 20) % 360}, 100%, 60%)`
        this.ctx.shadowColor = `hsl(${(this.hue + i * 20) % 360}, 100%, 60%)`
      } else {
        this.ctx.fillStyle = scheme.bob
        this.ctx.shadowColor = scheme.bob
      }

      this.ctx.shadowBlur = 10 + energy * 15
      this.ctx.fill()

      // Highlight on bob
      this.ctx.beginPath()
      this.ctx.arc(bobX - bobRadius * 0.3, bobY - bobRadius * 0.3, bobRadius * 0.25, 0, Math.PI * 2)
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      this.ctx.shadowBlur = 0
      this.ctx.fill()
    }

    this.time += 0.05 + avgEnergy * 0.05
    this.hue = (this.hue + 0.3) % 360
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
