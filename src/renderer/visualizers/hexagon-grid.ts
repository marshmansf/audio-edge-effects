/**
 * Hexagon Grid Visualizer
 * Honeycomb cells that light up based on frequency regions
 * Ripple effects from beat detection
 */

export interface HexagonGridOptions {
  container: HTMLElement
  colorScheme?: string
  hexSize?: number
}

const colorSchemes: Record<string, { low: string, mid: string, high: string, bg: string }> = {
  classic: { low: '#00ff00', mid: '#88ff00', high: '#ffff00', bg: '#001100' },
  blue: { low: '#0044ff', mid: '#0088ff', high: '#00ccff', bg: '#000022' },
  purple: { low: '#6600ff', mid: '#aa00ff', high: '#ff00ff', bg: '#110022' },
  fire: { low: '#ff0000', mid: '#ff6600', high: '#ffcc00', bg: '#110000' },
  ice: { low: '#0044ff', mid: '#00aaff', high: '#ffffff', bg: '#001122' },
  light: { low: '#666666', mid: '#aaaaaa', high: '#ffffff', bg: '#111111' },
  dark: { low: '#1a3a5e', mid: '#2a5a7e', high: '#4a7a9e', bg: '#050a10' },
  rainbow: { low: '#ff0000', mid: '#00ff00', high: '#0000ff', bg: '#111111' }
}

interface Hex {
  x: number
  y: number
  col: number
  row: number
  energy: number
  ripple: number
}

export class HexagonGridVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private hexagons: Hex[] = []
  private hexSize: number = 20
  private lastBassEnergy: number = 0
  private rippleCenter: { col: number, row: number } | null = null
  private hue: number = 0

  constructor(options: HexagonGridOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.hexSize = options.hexSize || 20

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private handleResize(): void {
    const parent = this.canvas.parentElement
    if (parent) {
      this.canvas.width = parent.offsetWidth * window.devicePixelRatio
      this.canvas.height = parent.offsetHeight * window.devicePixelRatio
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      this.generateGrid()
    }
  }

  private generateGrid(): void {
    this.hexagons = []

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    const hexWidth = this.hexSize * 2
    const hexHeight = this.hexSize * Math.sqrt(3)

    const cols = Math.ceil(width / (hexWidth * 0.75)) + 1
    const rows = Math.ceil(height / hexHeight) + 1

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * hexWidth * 0.75
        const y = row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0)

        this.hexagons.push({
          x, y, col, row,
          energy: 0,
          ripple: 0
        })
      }
    }
  }

  init(analyser: AnalyserNode): void {
    this.analyser = analyser
    this.dataArray = new Uint8Array(analyser.frequencyBinCount)
    this.generateGrid()
    this.draw()
  }

  private drawHexagon(cx: number, cy: number, size: number): void {
    this.ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3
      const x = cx + size * Math.cos(angle)
      const y = cy + size * Math.sin(angle)
      if (i === 0) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }
    }
    this.ctx.closePath()
  }

  private getColor(energy: number, col: number, row: number): string {
    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic
    const alpha = Math.min(1, energy * 1.5)

    if (this.colorScheme === 'rainbow') {
      const hue = (this.hue + col * 20 + row * 15) % 360
      return `hsla(${hue}, 100%, ${30 + energy * 50}%, ${alpha})`
    }

    // Blend between low/mid/high based on energy with alpha transparency
    if (energy < 0.33) {
      const rgb = this.hexToRgb(scheme.low)
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
    } else if (energy < 0.66) {
      return this.blendColorsWithAlpha(scheme.low, scheme.mid, (energy - 0.33) * 3, alpha)
    } else {
      return this.blendColorsWithAlpha(scheme.mid, scheme.high, (energy - 0.66) * 3, alpha)
    }
  }

  private blendColors(color1: string, color2: string, factor: number): string {
    const c1 = this.hexToRgb(color1)
    const c2 = this.hexToRgb(color2)

    const r = Math.round(c1.r + (c2.r - c1.r) * factor)
    const g = Math.round(c1.g + (c2.g - c1.g) * factor)
    const b = Math.round(c1.b + (c2.b - c1.b) * factor)

    return `rgb(${r}, ${g}, ${b})`
  }

  private blendColorsWithAlpha(color1: string, color2: string, factor: number, alpha: number): string {
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

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic
    this.ctx.clearRect(0, 0, width, height)

    // Calculate bass energy for beat detection
    const bassEnd = Math.floor(this.dataArray.length * 0.1)
    let bassEnergy = 0
    for (let i = 0; i < bassEnd; i++) {
      bassEnergy += this.dataArray[i]
    }
    bassEnergy = bassEnergy / bassEnd / 255

    // Detect beat (bass spike)
    if (bassEnergy > this.lastBassEnergy + 0.2 && bassEnergy > 0.5) {
      // Start ripple from random hexagon
      const centerHex = this.hexagons[Math.floor(Math.random() * this.hexagons.length)]
      this.rippleCenter = { col: centerHex.col, row: centerHex.row }
      this.hexagons.forEach(hex => {
        const dist = Math.sqrt(
          Math.pow(hex.col - centerHex.col, 2) +
          Math.pow(hex.row - centerHex.row, 2)
        )
        hex.ripple = Math.max(hex.ripple, 1 - dist * 0.1)
      })
    }
    this.lastBassEnergy = bassEnergy

    // Map frequency data to hexagons
    const hexCount = this.hexagons.length
    const binSize = Math.floor(this.dataArray.length / hexCount)

    this.hexagons.forEach((hex, i) => {
      // Map frequency based on position
      const freqIndex = Math.floor((hex.x / width) * this.dataArray.length * 0.8)
      const targetEnergy = this.dataArray[Math.min(freqIndex, this.dataArray.length - 1)] / 255

      // Smooth energy transition
      hex.energy += (targetEnergy - hex.energy) * 0.3

      // Add ripple energy
      const displayEnergy = Math.min(1, hex.energy + hex.ripple * 0.5)

      // Decay ripple
      hex.ripple *= 0.95

      // Draw hexagon
      this.drawHexagon(hex.x, hex.y, this.hexSize - 2)

      this.ctx.fillStyle = this.getColor(displayEnergy, hex.col, hex.row)
      this.ctx.fill()

      // Draw border for high energy cells
      if (displayEnergy > 0.5) {
        this.ctx.strokeStyle = this.colorScheme === 'rainbow'
          ? `hsla(${(this.hue + hex.col * 20) % 360}, 100%, 70%, ${displayEnergy})`
          : scheme.high
        this.ctx.lineWidth = 1
        this.ctx.globalAlpha = displayEnergy
        this.ctx.stroke()
        this.ctx.globalAlpha = 1
      }
    })

    // Apply edge fade - content fades to transparent towards inner edge
    this.ctx.globalCompositeOperation = 'destination-in'

    if (width > height * 2) {
      // Horizontal edge (top or bottom) - fade vertically, opaque at bottom (screen edge)
      const fadeGradient = this.ctx.createLinearGradient(0, 0, 0, height)
      fadeGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
      fadeGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)')
      fadeGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.6)')
      fadeGradient.addColorStop(1, 'rgba(255, 255, 255, 1)')
      this.ctx.fillStyle = fadeGradient
      this.ctx.fillRect(0, 0, width, height)
    } else if (height > width * 2) {
      // Vertical edge (left or right) - fade horizontally, opaque at right (screen edge)
      const fadeGradient = this.ctx.createLinearGradient(0, 0, width, 0)
      fadeGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
      fadeGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)')
      fadeGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.6)')
      fadeGradient.addColorStop(1, 'rgba(255, 255, 255, 1)')
      this.ctx.fillStyle = fadeGradient
      this.ctx.fillRect(0, 0, width, height)
    } else {
      // Square-ish - fade from center (transparent) to edges (opaque)
      const fadeGradient = this.ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.7
      )
      fadeGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
      fadeGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)')
      fadeGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.7)')
      fadeGradient.addColorStop(1, 'rgba(255, 255, 255, 1)')
      this.ctx.fillStyle = fadeGradient
      this.ctx.fillRect(0, 0, width, height)
    }

    this.ctx.globalCompositeOperation = 'source-over'

    this.hue = (this.hue + 0.5) % 360
  }

  setColorScheme(scheme: string): void {
    if (colorSchemes[scheme]) {
      this.colorScheme = scheme
    }
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    this.canvas.remove()
    window.removeEventListener('resize', () => this.handleResize())
  }
}
