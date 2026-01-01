/**
 * Color Field Visualizer
 * Pure gradient colors that shift hue/saturation based on audio
 * Minimal and hypnotic
 */

export interface ColorFieldOptions {
  container: HTMLElement
  colorScheme?: string
}

const colorSchemes: Record<string, { baseHue: number, saturation: number }> = {
  classic: { baseHue: 120, saturation: 100 }, // Green
  blue: { baseHue: 200, saturation: 100 },
  purple: { baseHue: 280, saturation: 100 },
  fire: { baseHue: 20, saturation: 100 },
  ice: { baseHue: 190, saturation: 80 },
  light: { baseHue: 0, saturation: 0 }, // Grayscale
  dark: { baseHue: 210, saturation: 40 },
  rainbow: { baseHue: 0, saturation: 100 } // Cycles
}

export class ColorFieldVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private hue: number = 0
  private targetHue: number = 0
  private currentSaturation: number = 100
  private currentLightness: number = 50
  private time: number = 0

  constructor(options: ColorFieldOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'rainbow'

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

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.rainbow

    // Calculate frequency characteristics
    const bassEnd = Math.floor(this.dataArray.length * 0.15)
    const midEnd = Math.floor(this.dataArray.length * 0.5)

    // Bass controls lightness pulsing
    let bassEnergy = 0
    for (let i = 0; i < bassEnd; i++) {
      bassEnergy += this.dataArray[i]
    }
    bassEnergy = bassEnergy / bassEnd / 255

    // Mid frequencies control saturation
    let midEnergy = 0
    for (let i = bassEnd; i < midEnd; i++) {
      midEnergy += this.dataArray[i]
    }
    midEnergy = midEnergy / (midEnd - bassEnd) / 255

    // High frequencies control hue shift
    let highEnergy = 0
    for (let i = midEnd; i < this.dataArray.length; i++) {
      highEnergy += this.dataArray[i]
    }
    highEnergy = highEnergy / (this.dataArray.length - midEnd) / 255

    // Frequency centroid for dominant pitch
    let weightedSum = 0
    let sum = 0
    for (let i = 0; i < this.dataArray.length; i++) {
      weightedSum += i * this.dataArray[i]
      sum += this.dataArray[i]
    }
    const centroid = sum > 0 ? weightedSum / sum / this.dataArray.length : 0.5

    // Update color parameters smoothly
    if (this.colorScheme === 'rainbow') {
      this.targetHue = (this.targetHue + highEnergy * 3 + 0.3) % 360
    } else if (this.colorScheme === 'light') {
      this.targetHue = 0
    } else {
      // Shift around base hue based on frequency
      this.targetHue = scheme.baseHue + centroid * 60 - 30
    }

    this.hue += (this.targetHue - this.hue) * 0.05

    const targetSaturation = this.colorScheme === 'light'
      ? 0
      : scheme.saturation * (0.5 + midEnergy * 0.5)
    this.currentSaturation += (targetSaturation - this.currentSaturation) * 0.1

    const targetLightness = 30 + bassEnergy * 40
    this.currentLightness += (targetLightness - this.currentLightness) * 0.15

    // Create gradient
    const gradient = this.ctx.createLinearGradient(0, 0, width, height)

    const hue1 = this.hue
    const hue2 = (this.hue + 30 + highEnergy * 30) % 360
    const hue3 = (this.hue + 60 + highEnergy * 60) % 360

    gradient.addColorStop(0, `hsl(${hue1}, ${this.currentSaturation}%, ${this.currentLightness}%)`)
    gradient.addColorStop(0.5, `hsl(${hue2}, ${this.currentSaturation}%, ${this.currentLightness + 10}%)`)
    gradient.addColorStop(1, `hsl(${hue3}, ${this.currentSaturation}%, ${this.currentLightness}%)`)

    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, width, height)

    // Add subtle radial overlay for depth
    const radialX = width * (0.3 + centroid * 0.4)
    const radialY = height * 0.5
    const radial = this.ctx.createRadialGradient(
      radialX, radialY, 0,
      radialX, radialY, Math.max(width, height) * 0.8
    )

    const overlayLightness = this.currentLightness + 20 + bassEnergy * 20
    radial.addColorStop(0, `hsla(${this.hue}, ${this.currentSaturation}%, ${overlayLightness}%, 0.3)`)
    radial.addColorStop(0.5, `hsla(${this.hue}, ${this.currentSaturation}%, ${overlayLightness}%, 0.1)`)
    radial.addColorStop(1, 'transparent')

    this.ctx.fillStyle = radial
    this.ctx.fillRect(0, 0, width, height)

    // Very subtle vignette
    const vignette = this.ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.7
    )
    vignette.addColorStop(0, 'transparent')
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.3)')

    this.ctx.fillStyle = vignette
    this.ctx.fillRect(0, 0, width, height)

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

    this.time += 0.01
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
