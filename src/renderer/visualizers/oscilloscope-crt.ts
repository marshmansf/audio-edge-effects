/**
 * Oscilloscope CRT Visualizer
 * Green phosphor look with bloom, scanlines, and CRT effects
 */

export interface OscilloscopeCrtOptions {
  container: HTMLElement
  colorScheme?: string
}

const colorSchemes: Record<string, { phosphor: string, glow: string, grid: string }> = {
  classic: { phosphor: '#00ff00', glow: '#00aa00', grid: '#003300' },
  blue: { phosphor: '#00ccff', glow: '#0088aa', grid: '#002233' },
  purple: { phosphor: '#cc00ff', glow: '#8800aa', grid: '#220033' },
  fire: { phosphor: '#ffaa00', glow: '#aa6600', grid: '#221100' },
  ice: { phosphor: '#00ffff', glow: '#00aaaa', grid: '#002222' },
  light: { phosphor: '#ffffff', glow: '#aaaaaa', grid: '#333333' },
  dark: { phosphor: '#4a7a9e', glow: '#2a5a7e', grid: '#0a1a2e' },
  rainbow: { phosphor: '#00ff00', glow: '#00aa00', grid: '#002200' }
}

export class OscilloscopeCrtVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private phosphorPersistence: ImageData | null = null
  private hue: number = 0
  private scanlineOffset: number = 0

  constructor(options: OscilloscopeCrtOptions) {
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
      this.phosphorPersistence = null
    }
  }

  init(analyser: AnalyserNode): void {
    this.analyser = analyser
    this.dataArray = new Uint8Array(analyser.fftSize)
    this.draw()
  }

  private drawGrid(width: number, height: number): void {
    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic
    const gridSize = 40

    this.ctx.strokeStyle = scheme.grid
    this.ctx.lineWidth = 0.5
    this.ctx.globalAlpha = 0.5

    // Vertical lines
    for (let x = gridSize; x < width; x += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, height)
      this.ctx.stroke()
    }

    // Horizontal lines
    for (let y = gridSize; y < height; y += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(width, y)
      this.ctx.stroke()
    }

    // Center lines (brighter)
    this.ctx.strokeStyle = scheme.glow
    this.ctx.lineWidth = 1

    this.ctx.beginPath()
    this.ctx.moveTo(width / 2, 0)
    this.ctx.lineTo(width / 2, height)
    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.moveTo(0, height / 2)
    this.ctx.lineTo(width, height / 2)
    this.ctx.stroke()

    this.ctx.globalAlpha = 1
  }

  private drawScanlines(width: number, height: number): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'

    for (let y = this.scanlineOffset; y < height; y += 3) {
      this.ctx.fillRect(0, y, width, 1)
    }

    this.scanlineOffset = (this.scanlineOffset + 0.5) % 3
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteTimeDomainData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Phosphor persistence effect (slow fade)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    this.ctx.fillRect(0, 0, width, height)

    // Draw grid
    this.drawGrid(width, height)

    // Calculate RMS for intensity
    let rms = 0
    for (let i = 0; i < this.dataArray.length; i++) {
      const sample = (this.dataArray[i] - 128) / 128
      rms += sample * sample
    }
    rms = Math.sqrt(rms / this.dataArray.length)

    // Draw waveform with CRT glow effect
    const centerY = height / 2

    // Multiple passes for glow
    const passes = [
      { blur: 20, width: 8, alpha: 0.2 },
      { blur: 10, width: 4, alpha: 0.4 },
      { blur: 5, width: 2, alpha: 0.6 },
      { blur: 0, width: 2, alpha: 1 }
    ]

    for (const pass of passes) {
      this.ctx.beginPath()

      for (let i = 0; i < this.dataArray.length; i++) {
        const x = (i / this.dataArray.length) * width
        const v = (this.dataArray[i] - 128) / 128
        const y = centerY + v * (height * 0.4)

        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }

      if (this.colorScheme === 'rainbow') {
        this.ctx.strokeStyle = `hsla(${this.hue}, 100%, 60%, ${pass.alpha})`
        this.ctx.shadowColor = `hsl(${this.hue}, 100%, 60%)`
      } else {
        this.ctx.strokeStyle = scheme.phosphor
        this.ctx.shadowColor = scheme.glow
        this.ctx.globalAlpha = pass.alpha
      }

      this.ctx.lineWidth = pass.width
      this.ctx.shadowBlur = pass.blur
      this.ctx.lineCap = 'round'
      this.ctx.lineJoin = 'round'
      this.ctx.stroke()
    }

    this.ctx.globalAlpha = 1
    this.ctx.shadowBlur = 0

    // Draw scanlines
    this.drawScanlines(width, height)

    // Vignette effect
    const gradient = this.ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.7
    )
    gradient.addColorStop(0, 'transparent')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)')

    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, width, height)

    // Screen curvature effect (subtle)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.rect(2, 2, width - 4, height - 4)
    this.ctx.stroke()

    this.hue = (this.hue + 0.3) % 360
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
