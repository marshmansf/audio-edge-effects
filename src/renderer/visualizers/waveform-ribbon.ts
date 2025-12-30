/**
 * Waveform Ribbon Visualizer
 * Multiple waveforms stacked with time delays for aurora/ribbon effect
 */

export interface WaveformRibbonOptions {
  container: HTMLElement
  colorScheme?: string
  ribbonCount?: number
}

const colorSchemes: Record<string, string[]> = {
  classic: ['#00ff00', '#00cc00', '#009900', '#006600', '#003300'],
  blue: ['#00ccff', '#00aadd', '#0088bb', '#006699', '#004477'],
  purple: ['#cc00ff', '#aa00dd', '#8800bb', '#660099', '#440077'],
  fire: ['#ff6600', '#ff4400', '#dd2200', '#bb0000', '#990000'],
  ice: ['#ffffff', '#ccffff', '#99ffff', '#66ccff', '#3399ff'],
  light: ['#ffffff', '#dddddd', '#bbbbbb', '#999999', '#777777'],
  dark: ['#4a7a9e', '#3a6a8e', '#2a5a7e', '#1a4a6e', '#0a3a5e'],
  rainbow: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff']
}

export class WaveformRibbonVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private ribbonCount: number
  private history: Uint8Array[] = []
  private hue: number = 0
  private frameCount: number = 0

  constructor(options: WaveformRibbonOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.ribbonCount = options.ribbonCount || 10

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
    this.dataArray = new Uint8Array(analyser.fftSize)
    this.history = []
    this.draw()
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteTimeDomainData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    this.ctx.clearRect(0, 0, width, height)

    // Store current waveform in history every 3rd frame for smoother ribbon
    this.frameCount++
    if (this.frameCount % 3 === 0) {
      const currentWave = new Uint8Array(this.dataArray)
      this.history.unshift(currentWave)
      if (this.history.length > this.ribbonCount) {
        this.history.pop()
      }
    }

    const colors = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Draw ribbons from back to front (oldest first)
    for (let r = this.history.length - 1; r >= 0; r--) {
      const waveData = this.history[r]
      const progress = r / this.ribbonCount
      const alpha = 1 - progress * 0.7

      // Vertical offset for ribbon stacking - spread them across the height
      const yOffset = height * 0.1 + progress * height * 0.8

      // Get color
      let strokeColor: string
      if (this.colorScheme === 'rainbow') {
        const hue = (this.hue + r * 25) % 360
        strokeColor = `hsla(${hue}, 100%, 60%, ${alpha})`
      } else {
        const colorIndex = Math.min(r, colors.length - 1)
        strokeColor = colors[colorIndex]
      }

      // Draw filled ribbon shape
      this.ctx.beginPath()

      const sliceWidth = width / waveData.length
      const amplitude = height * 0.3 * (1 - progress * 0.5)

      // Top edge of ribbon
      for (let i = 0; i < waveData.length; i++) {
        const x = i * sliceWidth
        const v = (waveData[i] - 128) / 128
        const y = yOffset + v * amplitude

        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }

      // Create gradient fill for ribbon
      const gradient = this.ctx.createLinearGradient(0, yOffset - amplitude, 0, yOffset + amplitude)
      if (this.colorScheme === 'rainbow') {
        const hue = (this.hue + r * 25) % 360
        gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${alpha * 0.3})`)
        gradient.addColorStop(0.5, `hsla(${hue}, 100%, 50%, ${alpha * 0.5})`)
        gradient.addColorStop(1, `hsla(${hue}, 100%, 40%, ${alpha * 0.2})`)
      } else {
        gradient.addColorStop(0, `${strokeColor}33`)
        gradient.addColorStop(0.5, `${strokeColor}66`)
        gradient.addColorStop(1, `${strokeColor}22`)
      }

      // Draw the stroke
      this.ctx.strokeStyle = strokeColor
      this.ctx.lineWidth = 2 + (1 - progress) * 2
      this.ctx.shadowBlur = 10 + (1 - progress) * 10
      this.ctx.shadowColor = strokeColor
      if (this.colorScheme !== 'rainbow') {
        this.ctx.globalAlpha = alpha
      }
      this.ctx.stroke()

      // Fill below the line to create ribbon effect
      this.ctx.lineTo(width, height)
      this.ctx.lineTo(0, height)
      this.ctx.closePath()
      this.ctx.fillStyle = gradient
      this.ctx.shadowBlur = 0
      this.ctx.fill()

      this.ctx.globalAlpha = 1
    }

    this.ctx.shadowBlur = 0
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
