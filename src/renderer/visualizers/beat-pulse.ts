/**
 * Beat Pulse Visualizer
 * Pulsing arcs/waves that expand outward on bass transients
 * Detects beats via bass frequency energy
 */

import { AnimationController } from '../utils/animation-controller'

export interface BeatPulseOptions {
  container: HTMLElement
  colorScheme?: string
  density?: number
}

// Color schemes
const colorSchemes: Record<string, { primary: string, secondary: string }> = {
  classic: { primary: '#00ff00', secondary: '#88ff00' },
  blue: { primary: '#0088ff', secondary: '#00ccff' },
  purple: { primary: '#aa00ff', secondary: '#ff00ff' },
  fire: { primary: '#ff4400', secondary: '#ffcc00' },
  ice: { primary: '#00ccff', secondary: '#ffffff' },
  light: { primary: '#ffffff', secondary: '#cccccc' },
  dark: { primary: '#2a5a7e', secondary: '#4a7a9e' },
  rainbow: { primary: '#ff0000', secondary: '#00ff00' }
}

interface Pulse {
  radius: number
  maxRadius: number
  alpha: number
  color: string
  lineWidth: number
}

export class BeatPulseVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationController: AnimationController | null = null
  private colorScheme: string
  private density: number
  private pulses: Pulse[] = []
  private lastBassEnergy: number = 0
  private beatThreshold: number = 0.15
  private cooldown: number = 0
  private energyHistory: number[] = []
  private avgEnergy: number = 0
  private hue: number = 0

  constructor(options: BeatPulseOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.density = options.density ?? 64 // Default density

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

  private detectBeat(): { isBeat: boolean, energy: number } {
    if (!this.dataArray) return { isBeat: false, energy: 0 }

    // Calculate bass energy (first ~15% of frequency bins = sub-bass and bass)
    const bassEnd = Math.floor(this.dataArray.length * 0.15)
    let bassSum = 0
    for (let i = 0; i < bassEnd; i++) {
      bassSum += this.dataArray[i]
    }
    const bassEnergy = bassSum / bassEnd / 255

    // Track energy history for adaptive threshold
    this.energyHistory.push(bassEnergy)
    if (this.energyHistory.length > 30) {
      this.energyHistory.shift()
    }

    // Calculate average energy
    this.avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length

    // Detect beat: energy significantly above recent average
    const threshold = Math.max(this.avgEnergy * 1.4, this.beatThreshold)
    const isBeat = bassEnergy > threshold &&
                   bassEnergy > this.lastBassEnergy * 1.1 &&
                   this.cooldown === 0

    this.lastBassEnergy = bassEnergy

    return { isBeat, energy: bassEnergy }
  }

  private createPulse(energy: number): void {
    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Density affects how many pulses are created per beat (1 to 4 pulses)
    const pulseCount = Math.max(1, Math.floor(this.density / 32))

    for (let i = 0; i < pulseCount; i++) {
      let color: string

      if (this.colorScheme === 'rainbow') {
        color = `hsl(${this.hue}, 100%, 60%)`
        this.hue = (this.hue + 30) % 360
      } else {
        color = Math.random() > 0.5 ? scheme.primary : scheme.secondary
      }

      this.pulses.push({
        radius: i * 15, // Stagger initial radius for multiple pulses
        maxRadius: Math.max(
          this.canvas.width / window.devicePixelRatio,
          this.canvas.height / window.devicePixelRatio
        ) * 1.5,
        alpha: 1.0 + energy * 0.3, // Increased intensity
        color,
        lineWidth: 8 + energy * 20 // Increased thickness
      })
    }
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height)

    // Beat detection
    const { isBeat, energy } = this.detectBeat()

    if (this.cooldown > 0) {
      this.cooldown--
    }

    if (isBeat) {
      this.createPulse(energy)
      // Density affects cooldown: higher density = shorter cooldown = more responsive
      // Range from 6 (low density) to 2 (high density)
      this.cooldown = Math.max(2, Math.floor(8 - this.density / 24))
    }

    // Origin at bottom center (screen edge)
    const originX = width / 2
    const originY = height + 5

    // Cap maximum pulses based on density to prevent performance degradation
    const maxPulses = Math.floor(this.density / 4) + 10
    if (this.pulses.length > maxPulses) {
      // Remove oldest/faintest pulses
      this.pulses.sort((a, b) => b.alpha - a.alpha)
      this.pulses = this.pulses.slice(0, maxPulses)
    }

    // Group pulses by color for batched rendering
    const pulsesByColor = new Map<string, Pulse[]>()

    // Update pulses and group by color
    this.pulses = this.pulses.filter(pulse => {
      // Expand radius
      pulse.radius += 8 + (pulse.lineWidth / 2)

      // Fade out as it expands
      pulse.alpha *= 0.97

      // Remove if too faint or too large
      if (pulse.alpha < 0.02 || pulse.radius > pulse.maxRadius) {
        return false
      }

      // Group by color for batched drawing
      if (!pulsesByColor.has(pulse.color)) {
        pulsesByColor.set(pulse.color, [])
      }
      pulsesByColor.get(pulse.color)!.push(pulse)

      return true
    })

    // Draw all pulses batched by color (reduces context state changes)
    // Use single shadow setting for all pulses of same color
    for (const [color, pulses] of pulsesByColor) {
      // Set shadow once per color group
      this.ctx.shadowColor = color
      this.ctx.shadowBlur = 20 // Fixed moderate blur instead of per-pulse
      this.ctx.strokeStyle = color

      // Draw glow layer first (thicker, more transparent)
      for (const pulse of pulses) {
        this.ctx.beginPath()
        this.ctx.arc(originX, originY, pulse.radius, Math.PI, 0)
        this.ctx.lineWidth = pulse.lineWidth * 1.5
        this.ctx.globalAlpha = pulse.alpha * 0.4
        this.ctx.stroke()
      }

      // Draw main layer (no shadow needed, glow layer provides it)
      this.ctx.shadowBlur = 0
      for (const pulse of pulses) {
        this.ctx.beginPath()
        this.ctx.arc(originX, originY, pulse.radius, Math.PI, 0)
        this.ctx.lineWidth = pulse.lineWidth * (0.5 + pulse.alpha * 0.5)
        this.ctx.globalAlpha = Math.min(1, pulse.alpha * 1.2)
        this.ctx.stroke()

        // Draw inner ring for high-alpha pulses
        if (pulse.alpha > 0.3) {
          this.ctx.beginPath()
          this.ctx.arc(originX, originY, pulse.radius * 0.92, Math.PI, 0)
          this.ctx.lineWidth = pulse.lineWidth * 0.4
          this.ctx.globalAlpha = pulse.alpha * 0.6
          this.ctx.stroke()
        }
      }
    }

    // Reset context state
    this.ctx.globalAlpha = 1
    this.ctx.shadowBlur = 0

    // Draw constant subtle ambient energy indicator
    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic
    const ambientRadius = 30 + energy * 120
    const ambientAlpha = 0.15 + energy * 0.35

    this.ctx.beginPath()
    this.ctx.arc(originX, originY, ambientRadius, Math.PI, 0)
    this.ctx.strokeStyle = scheme.primary
    this.ctx.lineWidth = 4 + energy * 4
    this.ctx.globalAlpha = ambientAlpha
    this.ctx.shadowBlur = 12 // Reduced from 15 + energy * 10
    this.ctx.shadowColor = scheme.primary
    this.ctx.stroke()

    this.ctx.globalAlpha = 1
    this.ctx.shadowBlur = 0
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
