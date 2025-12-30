/**
 * Waveform Lissajous Visualizer
 * X/Y oscilloscope mode - creates spiraling patterns from audio
 */

export interface WaveformLissajousOptions {
  container: HTMLElement
  colorScheme?: string
  detail?: number
}

const colorSchemes: Record<string, { primary: string, secondary: string }> = {
  classic: { primary: '#00ff00', secondary: '#88ff88' },
  blue: { primary: '#00ccff', secondary: '#88ddff' },
  purple: { primary: '#cc00ff', secondary: '#dd88ff' },
  fire: { primary: '#ff6600', secondary: '#ffaa44' },
  ice: { primary: '#00ffff', secondary: '#aaffff' },
  light: { primary: '#ffffff', secondary: '#cccccc' },
  dark: { primary: '#4a7a9e', secondary: '#2a5a7e' },
  rainbow: { primary: '#ff00ff', secondary: '#00ffff' }
}

export class WaveformLissajousVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private timeData: Uint8Array | null = null
  private freqData: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private detail: number
  private trailCanvas: HTMLCanvasElement
  private trailCtx: CanvasRenderingContext2D
  private phase: number = 0
  private hue: number = 0

  constructor(options: WaveformLissajousOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    // Create offscreen canvas for trails
    this.trailCanvas = document.createElement('canvas')
    const trailCtx = this.trailCanvas.getContext('2d')
    if (!trailCtx) throw new Error('Could not get trail canvas context')
    this.trailCtx = trailCtx

    this.colorScheme = options.colorScheme || 'classic'
    this.detail = options.detail || 2

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private handleResize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect()
    if (rect) {
      this.canvas.width = rect.width * window.devicePixelRatio
      this.canvas.height = rect.height * window.devicePixelRatio
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

      this.trailCanvas.width = this.canvas.width
      this.trailCanvas.height = this.canvas.height
      this.trailCtx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
  }

  init(analyser: AnalyserNode): void {
    this.analyser = analyser
    this.timeData = new Uint8Array(analyser.fftSize)
    this.freqData = new Uint8Array(analyser.frequencyBinCount)
    this.draw()
  }

  private draw = (): void => {
    if (!this.analyser || !this.timeData || !this.freqData) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteTimeDomainData(this.timeData)
    this.analyser.getByteFrequencyData(this.freqData)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio
    const centerX = width / 2
    const centerY = height / 2

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Fade the trail canvas by redrawing with reduced opacity
    this.trailCtx.globalCompositeOperation = 'destination-out'
    this.trailCtx.fillStyle = 'rgba(0, 0, 0, 0.03)'
    this.trailCtx.fillRect(0, 0, width, height)
    this.trailCtx.globalCompositeOperation = 'source-over'

    // Clear main canvas and copy trails
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.drawImage(this.trailCanvas, 0, 0, width, height)

    const size = Math.min(width, height) * 0.8

    // Calculate audio energy
    const avgEnergy = this.freqData.reduce((a, b) => a + b, 0) / this.freqData.length / 255

    // Create Lissajous pattern with offset positions from waveform
    const offset = Math.floor(this.timeData.length / 4)

    this.ctx.beginPath()
    this.ctx.lineWidth = 2 + avgEnergy * 3

    // Draw connected line through all points
    let firstPoint = true
    const step = Math.max(1, Math.floor(6 - this.detail))
    for (let i = 0; i < this.timeData.length; i += step) {
      const xIndex = i
      const yIndex = (i + offset) % this.timeData.length

      const xNorm = (this.timeData[xIndex] - 128) / 128
      const yNorm = (this.timeData[yIndex] - 128) / 128

      // Add rotation based on phase
      const cos = Math.cos(this.phase)
      const sin = Math.sin(this.phase)
      const rotX = xNorm * cos - yNorm * sin
      const rotY = xNorm * sin + yNorm * cos

      // Scale based on audio energy
      const scale = 0.5 + avgEnergy * 0.8
      const x = centerX + rotX * size * scale
      const y = centerY + rotY * size * scale

      if (firstPoint) {
        this.ctx.moveTo(x, y)
        firstPoint = false
      } else {
        this.ctx.lineTo(x, y)
      }
    }

    // Close the path
    this.ctx.closePath()

    // Draw the Lissajous figure
    if (this.colorScheme === 'rainbow') {
      this.ctx.strokeStyle = `hsl(${this.hue}, 100%, 60%)`
      this.ctx.shadowColor = `hsl(${this.hue}, 100%, 60%)`
    } else {
      this.ctx.strokeStyle = scheme.primary
      this.ctx.shadowColor = scheme.primary
    }
    this.ctx.shadowBlur = 15 + avgEnergy * 20
    this.ctx.stroke()

    // Draw to trail canvas
    this.trailCtx.strokeStyle = this.ctx.strokeStyle as string
    this.trailCtx.lineWidth = this.ctx.lineWidth
    this.trailCtx.shadowBlur = 10
    this.trailCtx.shadowColor = this.ctx.shadowColor as string
    this.trailCtx.stroke(new Path2D(this.ctx.canvas.toDataURL()))

    // Actually redraw the path on trail canvas
    this.trailCtx.beginPath()
    firstPoint = true
    for (let i = 0; i < this.timeData.length; i += step) {
      const xIndex = i
      const yIndex = (i + offset) % this.timeData.length

      const xNorm = (this.timeData[xIndex] - 128) / 128
      const yNorm = (this.timeData[yIndex] - 128) / 128

      const cos = Math.cos(this.phase)
      const sin = Math.sin(this.phase)
      const rotX = xNorm * cos - yNorm * sin
      const rotY = xNorm * sin + yNorm * cos

      const scale = 0.5 + avgEnergy * 0.8
      const x = centerX + rotX * size * scale
      const y = centerY + rotY * size * scale

      if (firstPoint) {
        this.trailCtx.moveTo(x, y)
        firstPoint = false
      } else {
        this.trailCtx.lineTo(x, y)
      }
    }
    this.trailCtx.closePath()
    this.trailCtx.globalAlpha = 0.3
    this.trailCtx.stroke()
    this.trailCtx.globalAlpha = 1
    this.trailCtx.shadowBlur = 0

    this.ctx.shadowBlur = 0

    // Update phase for rotation
    this.phase += 0.02 + avgEnergy * 0.08
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
