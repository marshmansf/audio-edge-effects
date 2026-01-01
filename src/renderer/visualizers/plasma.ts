/**
 * Plasma Wave Visualizer
 * Flowing aurora/plasma effect driven by audio
 * Each wave segment responds to different frequency bins
 */

export interface PlasmaOptions {
  container: HTMLElement
  colorScheme?: string
}

// Color schemes with multiple wave colors
const colorSchemes: Record<string, { colors: string[] }> = {
  classic: { colors: ['#00ff00', '#00cc00', '#009900', '#006600'] },
  blue: { colors: ['#00ccff', '#0088ff', '#0044ff', '#0022aa'] },
  purple: { colors: ['#ff00ff', '#cc00ff', '#9900ff', '#6600cc'] },
  fire: { colors: ['#ff0000', '#ff4400', '#ff8800', '#ffcc00'] },
  ice: { colors: ['#ffffff', '#ccffff', '#00ffff', '#00ccff'] },
  light: { colors: ['#ffffff', '#eeeeee', '#dddddd', '#cccccc'] },
  dark: { colors: ['#2a3a5a', '#1a2a4a', '#0a1a3a', '#001020'] },
  rainbow: { colors: ['#ff0000', '#00ff00', '#0000ff', '#ff00ff'] }
}

export class PlasmaVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private phase: number = 0
  private waveCount: number = 6
  private smoothedBins: number[] = []

  constructor(options: PlasmaOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'purple'

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
    // Initialize smoothed bins for 32 frequency segments
    this.smoothedBins = new Array(32).fill(0)
    this.draw()
  }

  private getFrequencyEnergy(lowPercent: number, highPercent: number): number {
    if (!this.dataArray) return 0

    const low = Math.floor(this.dataArray.length * lowPercent)
    const high = Math.floor(this.dataArray.length * highPercent)

    let sum = 0
    for (let i = low; i < high; i++) {
      sum += this.dataArray[i]
    }
    return sum / (high - low) / 255
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    // Clear canvas (no background)
    this.ctx.clearRect(0, 0, width, height)

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.purple

    // Update smoothed frequency bins (32 segments across the width)
    const binCount = 32
    const segmentSize = Math.floor(this.dataArray.length * 0.5 / binCount)
    for (let i = 0; i < binCount; i++) {
      let sum = 0
      for (let j = 0; j < segmentSize; j++) {
        sum += this.dataArray[i * segmentSize + j]
      }
      const rawValue = sum / segmentSize / 255
      this.smoothedBins[i] = this.smoothedBins[i] * 0.7 + rawValue * 0.3
    }

    // Get overall energy levels
    const bassEnergy = this.getFrequencyEnergy(0, 0.1)
    const midEnergy = this.getFrequencyEnergy(0.1, 0.4)
    const highEnergy = this.getFrequencyEnergy(0.4, 0.8)

    // Advance phase based on bass
    this.phase += 0.015 + bassEnergy * 0.04

    // Draw layered waves from bottom
    const baseline = height

    for (let wave = 0; wave < this.waveCount; wave++) {
      const waveProgress = wave / this.waveCount
      const colorIndex = Math.floor(waveProgress * scheme.colors.length)
      const color = scheme.colors[Math.min(colorIndex, scheme.colors.length - 1)]

      // Each wave uses different frequency ranges
      const wavePhase = this.phase + wave * 0.4
      const baseFrequency = 1.5 + wave * 0.3
      const baseAmplitude = height * 0.12 * (1 - waveProgress * 0.2)
      const yOffset = wave * (height / this.waveCount) * 0.7

      // Build path with frequency-modulated heights
      this.ctx.beginPath()
      this.ctx.moveTo(0, baseline)

      const segmentsPerWave = 64
      for (let seg = 0; seg <= segmentsPerWave; seg++) {
        const x = (seg / segmentsPerWave) * width
        const xPercent = seg / segmentsPerWave

        // Get local frequency energy for this x position
        const binIndex = Math.floor(xPercent * (binCount - 1))
        const localEnergy = this.smoothedBins[binIndex]

        // Mix of base wave patterns with frequency modulation
        const wave1 = Math.sin(xPercent * Math.PI * baseFrequency + wavePhase)
        const wave2 = Math.sin(xPercent * Math.PI * baseFrequency * 2.1 + wavePhase * 1.3) * 0.4
        const wave3 = Math.sin(xPercent * Math.PI * baseFrequency * 0.7 + wavePhase * 0.6) * 0.3

        // Combine waves with local frequency modulation
        const combinedWave = (wave1 + wave2 + wave3) / 1.7

        // Modulate amplitude based on position-specific frequency and overall energy
        const energyMod = 0.4 + localEnergy * 1.5 + (bassEnergy * 0.3 + midEnergy * 0.2)
        const amplitude = baseAmplitude * energyMod

        const y = baseline - yOffset - amplitude * (0.8 + combinedWave * 0.5)

        this.ctx.lineTo(x, y)
      }

      // Complete the shape to baseline
      this.ctx.lineTo(width, baseline)
      this.ctx.closePath()

      // Fill with gradient - more variation based on energy
      const gradientStrength = 0.3 + (bassEnergy + midEnergy) * 0.3
      const gradient = this.ctx.createLinearGradient(0, baseline - yOffset - baseAmplitude * 2, 0, baseline)

      if (this.colorScheme === 'rainbow') {
        const hue = (wave / this.waveCount * 360 + this.phase * 30) % 360
        gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${gradientStrength})`)
        gradient.addColorStop(1, `hsla(${hue}, 100%, 40%, 0.05)`)
      } else {
        gradient.addColorStop(0, this.hexToRgba(color, gradientStrength))
        gradient.addColorStop(1, this.hexToRgba(color, 0.03))
      }

      this.ctx.fillStyle = gradient
      this.ctx.fill()

      // Draw wave edge with glow - thickness varies with energy
      this.ctx.beginPath()
      for (let seg = 0; seg <= segmentsPerWave; seg++) {
        const x = (seg / segmentsPerWave) * width
        const xPercent = seg / segmentsPerWave

        const binIndex = Math.floor(xPercent * (binCount - 1))
        const localEnergy = this.smoothedBins[binIndex]

        const wave1 = Math.sin(xPercent * Math.PI * baseFrequency + wavePhase)
        const wave2 = Math.sin(xPercent * Math.PI * baseFrequency * 2.1 + wavePhase * 1.3) * 0.4
        const wave3 = Math.sin(xPercent * Math.PI * baseFrequency * 0.7 + wavePhase * 0.6) * 0.3
        const combinedWave = (wave1 + wave2 + wave3) / 1.7

        const energyMod = 0.4 + localEnergy * 1.5 + (bassEnergy * 0.3 + midEnergy * 0.2)
        const amplitude = baseAmplitude * energyMod
        const y = baseline - yOffset - amplitude * (0.8 + combinedWave * 0.5)

        if (seg === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }

      const strokeAlpha = 0.5 + highEnergy * 0.3
      this.ctx.strokeStyle = this.colorScheme === 'rainbow'
        ? `hsla(${(wave / this.waveCount * 360 + this.phase * 30) % 360}, 100%, 70%, ${strokeAlpha})`
        : this.hexToRgba(color, strokeAlpha)
      this.ctx.lineWidth = 1 + bassEnergy * 2
      this.ctx.shadowBlur = 8 + bassEnergy * 10
      this.ctx.shadowColor = color
      this.ctx.stroke()
    }

    this.ctx.shadowBlur = 0
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
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
