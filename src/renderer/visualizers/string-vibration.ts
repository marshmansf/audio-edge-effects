/**
 * String Vibration Visualizer
 * Strings that visibly vibrate with sine wave patterns based on audio frequency
 */

export interface StringVibrationOptions {
  container: HTMLElement
  colorScheme?: string
  stringCount?: number
}

const colorSchemes: Record<string, string[]> = {
  classic: ['#00ff00', '#44ff00', '#88ff00', '#ccff00', '#ffff00'],
  blue: ['#0044ff', '#0066ff', '#0088ff', '#00aaff', '#00ccff'],
  purple: ['#6600ff', '#8800ff', '#aa00ff', '#cc00ff', '#ee00ff'],
  fire: ['#ff0000', '#ff2200', '#ff4400', '#ff6600', '#ff8800'],
  ice: ['#0066ff', '#0099ff', '#00ccff', '#00ffff', '#aaffff'],
  light: ['#aaaaaa', '#bbbbbb', '#cccccc', '#dddddd', '#ffffff'],
  dark: ['#1a3a5e', '#2a4a6e', '#3a5a7e', '#4a6a8e', '#5a7a9e'],
  rainbow: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00ffff']
}

export class StringVibrationVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private stringCount: number
  private time: number = 0
  private hue: number = 0

  constructor(options: StringVibrationOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.stringCount = options.stringCount || 6

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
    this.draw()
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    this.ctx.clearRect(0, 0, width, height)

    const colors = colorSchemes[this.colorScheme] || colorSchemes.classic
    const stringSpacing = height / (this.stringCount + 1)

    // Calculate energy per string from frequency bands
    const bandSize = Math.floor(this.dataArray.length / this.stringCount)

    for (let s = 0; s < this.stringCount; s++) {
      const baseY = stringSpacing * (s + 1)

      // Calculate energy for this string's frequency band
      let energy = 0
      for (let i = 0; i < bandSize; i++) {
        energy += this.dataArray[s * bandSize + i]
      }
      energy = energy / bandSize / 255

      // String properties - different harmonics for each string
      const frequency = (s + 1) * 2 // Harmonic frequency (more waves for higher strings)
      const amplitude = stringSpacing * 0.35 * energy // Amplitude based on energy
      const phase = this.time * (3 + s * 0.5) // Phase speed

      // Draw string vibration as a sine wave
      this.ctx.beginPath()

      const segments = 100
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * width
        const normalizedX = i / segments

        // Create standing wave pattern with multiple harmonics
        const wave1 = Math.sin(normalizedX * Math.PI * frequency + phase) * amplitude
        const wave2 = Math.sin(normalizedX * Math.PI * (frequency + 1) + phase * 1.5) * amplitude * 0.3
        const wave3 = Math.sin(normalizedX * Math.PI * (frequency * 2) + phase * 2) * amplitude * 0.15

        // Envelope to taper at endpoints (strings are fixed at ends)
        const envelope = Math.sin(normalizedX * Math.PI)

        const y = baseY + (wave1 + wave2 + wave3) * envelope

        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }

      // Style based on energy
      const lineWidth = 2 + energy * 4

      if (this.colorScheme === 'rainbow') {
        const hue = (this.hue + s * 50) % 360
        this.ctx.strokeStyle = `hsl(${hue}, 100%, ${50 + energy * 30}%)`
        this.ctx.shadowColor = `hsl(${hue}, 100%, 60%)`
      } else {
        this.ctx.strokeStyle = colors[s % colors.length]
        this.ctx.shadowColor = colors[s % colors.length]
      }

      this.ctx.lineWidth = lineWidth
      this.ctx.shadowBlur = 10 + energy * 20
      this.ctx.lineCap = 'round'
      this.ctx.stroke()

      // Draw a second, thinner brighter line for core
      this.ctx.beginPath()
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * width
        const normalizedX = i / segments

        const wave1 = Math.sin(normalizedX * Math.PI * frequency + phase) * amplitude
        const wave2 = Math.sin(normalizedX * Math.PI * (frequency + 1) + phase * 1.5) * amplitude * 0.3
        const wave3 = Math.sin(normalizedX * Math.PI * (frequency * 2) + phase * 2) * amplitude * 0.15

        const envelope = Math.sin(normalizedX * Math.PI)
        const y = baseY + (wave1 + wave2 + wave3) * envelope

        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }

      if (this.colorScheme === 'rainbow') {
        this.ctx.strokeStyle = `hsl(${(this.hue + s * 50) % 360}, 100%, 80%)`
      } else {
        this.ctx.strokeStyle = '#ffffff'
        this.ctx.globalAlpha = 0.3 + energy * 0.4
      }
      this.ctx.lineWidth = lineWidth * 0.3
      this.ctx.shadowBlur = 0
      this.ctx.stroke()
      this.ctx.globalAlpha = 1

      // Draw anchor points at string ends
      const anchorRadius = 4 + energy * 3

      // Left anchor
      this.ctx.beginPath()
      this.ctx.arc(0, baseY, anchorRadius, 0, Math.PI * 2)
      if (this.colorScheme === 'rainbow') {
        this.ctx.fillStyle = `hsl(${(this.hue + s * 50) % 360}, 100%, 70%)`
      } else {
        this.ctx.fillStyle = colors[s % colors.length]
      }
      this.ctx.shadowBlur = 5
      this.ctx.fill()

      // Right anchor
      this.ctx.beginPath()
      this.ctx.arc(width, baseY, anchorRadius, 0, Math.PI * 2)
      this.ctx.fill()

      this.ctx.shadowBlur = 0
    }

    this.time += 0.05
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
