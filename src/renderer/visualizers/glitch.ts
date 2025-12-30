/**
 * Glitch Visualizer
 * Glitch art aesthetic - RGB split, scan lines, data moshing effects
 * Beat triggers glitch intensity
 */

export interface GlitchOptions {
  container: HTMLElement
  colorScheme?: string
}

const colorSchemes: Record<string, { r: string, g: string, b: string }> = {
  classic: { r: '#ff0000', g: '#00ff00', b: '#0000ff' },
  blue: { r: '#0044ff', g: '#00ffff', b: '#00aaff' },
  purple: { r: '#ff00ff', g: '#aa00ff', b: '#6600ff' },
  fire: { r: '#ff0000', g: '#ff6600', b: '#ffcc00' },
  ice: { r: '#0066ff', g: '#00ccff', b: '#ffffff' },
  light: { r: '#ffaaaa', g: '#aaffaa', b: '#aaaaff' },
  dark: { r: '#4a2a2a', g: '#2a4a2a', b: '#2a2a4a' },
  rainbow: { r: '#ff0000', g: '#00ff00', b: '#0000ff' }
}

interface GlitchBlock {
  x: number
  y: number
  width: number
  height: number
  offsetX: number
  offsetY: number
  life: number
}

export class GlitchVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private glitchBlocks: GlitchBlock[] = []
  private lastBassEnergy: number = 0
  private rgbSplit: number = 0
  private scanlineOffset: number = 0
  private hue: number = 0

  constructor(options: GlitchOptions) {
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
    const rect = this.canvas.parentElement?.getBoundingClientRect()
    if (rect) {
      this.canvas.width = rect.width * window.devicePixelRatio
      this.canvas.height = rect.height * window.devicePixelRatio
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
  }

  init(analyser: AnalyserNode): void {
    this.analyser = analyser
    this.dataArray = new Uint8Array(analyser.frequencyBinCount)
    this.draw()
  }

  private createGlitchBlock(width: number, height: number): void {
    const blockWidth = 20 + Math.random() * 100
    const blockHeight = 5 + Math.random() * 30

    this.glitchBlocks.push({
      x: Math.random() * width,
      y: Math.random() * height,
      width: blockWidth,
      height: blockHeight,
      offsetX: (Math.random() - 0.5) * 50,
      offsetY: (Math.random() - 0.5) * 10,
      life: 1
    })
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Calculate energy
    const bassEnd = Math.floor(this.dataArray.length * 0.15)
    let bassEnergy = 0
    for (let i = 0; i < bassEnd; i++) {
      bassEnergy += this.dataArray[i]
    }
    bassEnergy = bassEnergy / bassEnd / 255

    let totalEnergy = 0
    for (let i = 0; i < this.dataArray.length; i++) {
      totalEnergy += this.dataArray[i]
    }
    const avgEnergy = totalEnergy / this.dataArray.length / 255

    // Detect beat for glitch triggers
    const beatDetected = bassEnergy > this.lastBassEnergy + 0.2 && bassEnergy > 0.5
    if (beatDetected) {
      // Create glitch blocks
      const blockCount = Math.floor(3 + bassEnergy * 5)
      for (let i = 0; i < blockCount; i++) {
        this.createGlitchBlock(width, height)
      }
      this.rgbSplit = bassEnergy * 20
    }

    this.lastBassEnergy = bassEnergy * 0.7 + this.lastBassEnergy * 0.3

    // Clear canvas with transparency
    this.ctx.clearRect(0, 0, width, height)

    // RGB channel separation amount based on audio
    const rgbOffset = this.rgbSplit + avgEnergy * 8

    // Draw glitch lines/stripes instead of spectrum bars
    this.ctx.globalCompositeOperation = 'screen'

    // Draw horizontal noise bands that react to different frequency ranges
    const numBands = 12
    const bandHeight = height / numBands

    for (let i = 0; i < numBands; i++) {
      const freqIndex = Math.floor((i / numBands) * this.dataArray.length * 0.5)
      const energy = this.dataArray[freqIndex] / 255

      if (energy > 0.1) {
        const y = i * bandHeight
        const bandWidth = width * energy
        const xOffset = (Math.random() - 0.5) * rgbOffset * 3

        // Red channel
        if (this.colorScheme === 'rainbow') {
          this.ctx.fillStyle = `hsla(${(this.hue + i * 20) % 360}, 100%, 50%, ${energy * 0.6})`
        } else {
          this.ctx.fillStyle = scheme.r
          this.ctx.globalAlpha = energy * 0.6
        }
        this.ctx.fillRect(xOffset - rgbOffset, y, bandWidth, bandHeight * 0.8)

        // Green channel
        if (this.colorScheme === 'rainbow') {
          this.ctx.fillStyle = `hsla(${(this.hue + i * 20 + 120) % 360}, 100%, 50%, ${energy * 0.6})`
        } else {
          this.ctx.fillStyle = scheme.g
          this.ctx.globalAlpha = energy * 0.6
        }
        this.ctx.fillRect(xOffset, y + 2, bandWidth, bandHeight * 0.8)

        // Blue channel
        if (this.colorScheme === 'rainbow') {
          this.ctx.fillStyle = `hsla(${(this.hue + i * 20 + 240) % 360}, 100%, 50%, ${energy * 0.6})`
        } else {
          this.ctx.fillStyle = scheme.b
          this.ctx.globalAlpha = energy * 0.6
        }
        this.ctx.fillRect(xOffset + rgbOffset, y + 4, bandWidth, bandHeight * 0.8)
      }
    }

    // Draw vertical pixel columns - unique glitch effect
    const numCols = 20
    const colWidth = width / numCols

    for (let i = 0; i < numCols; i++) {
      const freqIndex = Math.floor((i / numCols) * this.dataArray.length * 0.3)
      const energy = this.dataArray[freqIndex] / 255

      if (energy > 0.2 && Math.random() < energy) {
        const x = i * colWidth
        const colHeight = height * energy * (0.5 + Math.random() * 0.5)
        const yOffset = Math.random() * (height - colHeight)

        this.ctx.fillStyle = this.colorScheme === 'rainbow'
          ? `hsla(${(this.hue + i * 15) % 360}, 100%, 60%, ${energy * 0.5})`
          : scheme.g
        this.ctx.globalAlpha = energy * 0.5
        this.ctx.fillRect(x, yOffset, colWidth * 0.8, colHeight)
      }
    }

    this.ctx.globalCompositeOperation = 'source-over'
    this.ctx.globalAlpha = 1

    // Draw and update glitch blocks
    this.glitchBlocks = this.glitchBlocks.filter(block => {
      block.life -= 0.1

      if (block.life <= 0) return false

      // Random displacement on each frame
      const jitterX = (Math.random() - 0.5) * 10 * block.life
      const jitterY = (Math.random() - 0.5) * 5 * block.life

      // Draw glitch block (fake data corruption)
      this.ctx.fillStyle = Math.random() > 0.5
        ? scheme.r
        : Math.random() > 0.5 ? scheme.g : scheme.b
      this.ctx.globalAlpha = block.life * 0.5

      this.ctx.fillRect(
        block.x + block.offsetX + jitterX,
        block.y + block.offsetY + jitterY,
        block.width,
        block.height
      )

      return true
    })

    this.ctx.globalAlpha = 1

    // Semi-transparent scanlines effect
    this.ctx.strokeStyle = this.colorScheme === 'rainbow'
      ? `hsla(${this.hue}, 50%, 30%, 0.3)`
      : `${scheme.g}44`
    this.ctx.lineWidth = 1
    for (let y = this.scanlineOffset; y < height; y += 6) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(width, y)
      this.ctx.stroke()
    }
    this.scanlineOffset = (this.scanlineOffset + 0.5) % 6

    // Random horizontal glitch lines
    if (avgEnergy > 0.2) {
      const numLines = Math.floor(avgEnergy * 5)
      for (let i = 0; i < numLines; i++) {
        if (Math.random() < avgEnergy * 0.5) {
          const tearY = Math.random() * height
          const tearWidth = width * (0.3 + Math.random() * 0.7)
          const tearX = (Math.random() - 0.5) * rgbOffset * 2

          this.ctx.fillStyle = this.colorScheme === 'rainbow'
            ? `hsla(${(this.hue + Math.random() * 60) % 360}, 100%, 60%, ${avgEnergy * 0.4})`
            : scheme.r
          this.ctx.globalAlpha = avgEnergy * 0.4
          this.ctx.fillRect(tearX, tearY, tearWidth, 2 + Math.random() * 4)
        }
      }
      this.ctx.globalAlpha = 1
    }

    // Decay RGB split
    this.rgbSplit *= 0.9

    this.hue = (this.hue + 1) % 360
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
