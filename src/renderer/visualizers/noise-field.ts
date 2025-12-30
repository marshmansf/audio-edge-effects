/**
 * Noise Field Visualizer
 * Perlin-like noise that warps and flows based on frequency bands
 */

export interface NoiseFieldOptions {
  container: HTMLElement
  colorScheme?: string
  scale?: number
}

const colorSchemes: Record<string, { primary: string, secondary: string }> = {
  classic: { primary: '#00ff00', secondary: '#003300' },
  blue: { primary: '#00ccff', secondary: '#001133' },
  purple: { primary: '#cc00ff', secondary: '#110022' },
  fire: { primary: '#ff6600', secondary: '#220000' },
  ice: { primary: '#00ffff', secondary: '#001122' },
  light: { primary: '#ffffff', secondary: '#333333' },
  dark: { primary: '#4a7a9e', secondary: '#0a1a2e' },
  rainbow: { primary: '#ffffff', secondary: '#000000' }
}

export class NoiseFieldVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private scale: number
  private time: number = 0
  private hue: number = 0
  private permutation: number[] = []

  constructor(options: NoiseFieldOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.scale = options.scale || 50

    // Initialize permutation table for noise
    this.initPermutation()

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private initPermutation(): void {
    // Simplified permutation for noise-like effect
    this.permutation = []
    for (let i = 0; i < 256; i++) {
      this.permutation.push(i)
    }
    // Shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]]
    }
    // Double for overflow
    this.permutation = [...this.permutation, ...this.permutation]
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

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3
    const u = h < 2 ? x : y
    const v = h < 2 ? y : x
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  private noise(x: number, y: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255

    x -= Math.floor(x)
    y -= Math.floor(y)

    const u = this.fade(x)
    const v = this.fade(y)

    const A = this.permutation[X] + Y
    const B = this.permutation[X + 1] + Y

    return this.lerp(
      this.lerp(
        this.grad(this.permutation[A], x, y),
        this.grad(this.permutation[B], x - 1, y),
        u
      ),
      this.lerp(
        this.grad(this.permutation[A + 1], x, y - 1),
        this.grad(this.permutation[B + 1], x - 1, y - 1),
        u
      ),
      v
    )
  }

  private fbm(x: number, y: number, octaves: number): number {
    let value = 0
    let amplitude = 1
    let frequency = 1
    let maxValue = 0

    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency) * amplitude
      maxValue += amplitude
      amplitude *= 0.5
      frequency *= 2
    }

    return value / maxValue
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Calculate frequency energies
    const bassEnd = Math.floor(this.dataArray.length * 0.15)
    const midEnd = Math.floor(this.dataArray.length * 0.5)

    let bassEnergy = 0
    for (let i = 0; i < bassEnd; i++) {
      bassEnergy += this.dataArray[i]
    }
    bassEnergy = bassEnergy / bassEnd / 255

    let midEnergy = 0
    for (let i = bassEnd; i < midEnd; i++) {
      midEnergy += this.dataArray[i]
    }
    midEnergy = midEnergy / (midEnd - bassEnd) / 255

    let highEnergy = 0
    for (let i = midEnd; i < this.dataArray.length; i++) {
      highEnergy += this.dataArray[i]
    }
    highEnergy = highEnergy / (this.dataArray.length - midEnd) / 255

    // Get image data for direct pixel manipulation (faster)
    const imageData = this.ctx.createImageData(width, height)
    const data = imageData.data

    const scale = 0.02 + bassEnergy * 0.02
    const octaves = 3 + Math.floor(midEnergy * 2)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate noise with audio-influenced distortion
        const distortX = x + Math.sin(y * 0.02 + this.time) * bassEnergy * 30
        const distortY = y + Math.cos(x * 0.02 + this.time) * bassEnergy * 30

        const noiseVal = this.fbm(
          distortX * scale + this.time * 0.5,
          distortY * scale,
          octaves
        )

        // Normalize to 0-1
        const normalized = (noiseVal + 1) / 2

        // Color based on scheme
        const index = (y * width + x) * 4

        if (this.colorScheme === 'rainbow') {
          const hue = (this.hue + normalized * 120 + x * 0.5) % 360
          const saturation = 80 + highEnergy * 20
          const lightness = 20 + normalized * 60

          // HSL to RGB conversion
          const c = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100
          const h = hue / 60
          const X = c * (1 - Math.abs(h % 2 - 1))
          const m = lightness / 100 - c / 2

          let r = 0, g = 0, b = 0
          if (h < 1) { r = c; g = X; }
          else if (h < 2) { r = X; g = c; }
          else if (h < 3) { g = c; b = X; }
          else if (h < 4) { g = X; b = c; }
          else if (h < 5) { r = X; b = c; }
          else { r = c; b = X; }

          data[index] = (r + m) * 255
          data[index + 1] = (g + m) * 255
          data[index + 2] = (b + m) * 255
          data[index + 3] = 255
        } else {
          // Parse colors
          const primary = this.hexToRgb(scheme.primary)
          const secondary = this.hexToRgb(scheme.secondary)

          // Interpolate
          data[index] = secondary.r + normalized * (primary.r - secondary.r)
          data[index + 1] = secondary.g + normalized * (primary.g - secondary.g)
          data[index + 2] = secondary.b + normalized * (primary.b - secondary.b)
          data[index + 3] = 255
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0)

    this.time += 0.02 + bassEnergy * 0.03
    this.hue = (this.hue + 0.5) % 360
  }

  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
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
