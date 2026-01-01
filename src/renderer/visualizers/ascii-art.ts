/**
 * ASCII Art Visualizer
 * Spectrum rendered as updating ASCII characters
 */

export interface AsciiArtOptions {
  container: HTMLElement
  colorScheme?: string
  cols?: number
}

const colorSchemes: Record<string, string> = {
  classic: '#00ff00',
  blue: '#00ccff',
  purple: '#cc00ff',
  fire: '#ff6600',
  ice: '#00ffff',
  light: '#ffffff',
  dark: '#4a7a9e',
  rainbow: '#ffffff'
}

export class AsciiArtVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private asciiChars: string = ' .,:;!|\\/*+<>[]{}()#&%@$'
  private baseCols: number
  private cols: number = 80
  private rows: number = 12
  private hue: number = 0

  constructor(options: AsciiArtOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.baseCols = options.cols || 80

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private handleResize(): void {
    const parent = this.canvas.parentElement
    if (parent) {
      this.canvas.width = parent.offsetWidth * window.devicePixelRatio
      this.canvas.height = parent.offsetHeight * window.devicePixelRatio
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

      // Calculate optimal cols/rows based on size and baseCols
      const width = parent.offsetWidth
      const height = parent.offsetHeight
      const charWidth = width / this.baseCols
      const charHeight = charWidth * 1.6

      this.cols = this.baseCols
      this.rows = Math.floor(height / charHeight)
    }
  }

  init(analyser: AnalyserNode): void {
    this.analyser = analyser
    this.dataArray = new Uint8Array(analyser.frequencyBinCount)
    this.draw()
  }

  private getAsciiChar(value: number): string {
    const index = Math.floor(value * (this.asciiChars.length - 1))
    return this.asciiChars[Math.min(index, this.asciiChars.length - 1)]
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear with transparent background
    this.ctx.clearRect(0, 0, width, height)

    const charWidth = width / this.cols
    const charHeight = height / this.rows
    const fontSize = Math.min(charWidth * 1.5, charHeight * 0.9)

    this.ctx.font = `${fontSize}px monospace`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'

    const baseColor = colorSchemes[this.colorScheme] || colorSchemes.classic
    const binSize = Math.floor(this.dataArray.length / this.cols)

    // Build spectrum data per column
    const columnEnergies: number[] = []
    for (let col = 0; col < this.cols; col++) {
      let sum = 0
      for (let i = 0; i < binSize; i++) {
        sum += this.dataArray[col * binSize + i]
      }
      columnEnergies.push(sum / binSize / 255)
    }

    // Draw ASCII spectrum - only lit characters (transparent background)
    for (let col = 0; col < this.cols; col++) {
      const energy = columnEnergies[col]
      const litRows = Math.ceil(energy * this.rows)

      for (let row = 0; row < litRows; row++) {
        const x = col * charWidth + charWidth / 2
        const y = (this.rows - 1 - row) * charHeight + charHeight / 2

        // Use intensity based on row position and energy
        const intensity = (row + 1) / this.rows
        const char = this.getAsciiChar(intensity * energy)

        if (this.colorScheme === 'rainbow') {
          const hue = (this.hue + col * 4 + row * 8) % 360
          const lightness = 50 + intensity * 30
          this.ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`
          this.ctx.shadowColor = `hsl(${hue}, 100%, 60%)`
        } else {
          this.ctx.fillStyle = baseColor
          this.ctx.shadowColor = baseColor
        }
        this.ctx.shadowBlur = 3 + intensity * 8
        this.ctx.globalAlpha = 0.6 + intensity * 0.4

        this.ctx.fillText(char, x, y)
      }
    }

    // Reset
    this.ctx.globalAlpha = 1
    this.ctx.shadowBlur = 0

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
