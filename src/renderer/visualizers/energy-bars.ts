/**
 * Energy Bars Visualizer
 * VU meter style with fewer, wider bars showing energy in frequency bands
 * Green/yellow/red color zones with peak hold indicators
 */

export interface EnergyBarsOptions {
  container: HTMLElement
  barCount?: number
  colorScheme?: string
}

// Color schemes - VU meter uses green/yellow/red regardless of scheme for authenticity
// But we can tint the overall appearance
const colorSchemes: Record<string, { low: string, mid: string, high: string, peak: string, bg: string }> = {
  classic: { low: '#00ff00', mid: '#ffff00', high: '#ff0000', peak: '#ffffff', bg: '#001100' },
  blue: { low: '#0066ff', mid: '#00ccff', high: '#ffffff', peak: '#ffffff', bg: '#000a1a' },
  purple: { low: '#6600ff', mid: '#cc00ff', high: '#ff00ff', peak: '#ffffff', bg: '#0a0015' },
  fire: { low: '#ff6600', mid: '#ff9900', high: '#ff0000', peak: '#ffffff', bg: '#1a0500' },
  ice: { low: '#0099ff', mid: '#00ffff', high: '#ffffff', peak: '#ffffff', bg: '#001520' },
  light: { low: '#00cc00', mid: '#cccc00', high: '#cc0000', peak: '#ffffff', bg: '#111111' },
  dark: { low: '#003311', mid: '#333300', high: '#330000', peak: '#666666', bg: '#000000' },
  rainbow: { low: '#00ff00', mid: '#ffff00', high: '#ff0000', peak: '#ffffff', bg: '#001100' }
}

export class EnergyBarsVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private barCount: number
  private colorScheme: string
  private peaks: number[] = []
  private peakHold: number[] = []
  private smoothedData: number[] = []

  // Frequency band labels (for reference)
  private readonly bandLabels = ['Sub', 'Bass', 'Low', 'LMid', 'Mid', 'HMid', 'High', 'Air']

  constructor(options: EnergyBarsOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    // Use density setting to determine bar count (4-32 range for VU meters)
    this.barCount = Math.min(Math.max(options.barCount || 8, 4), 32)
    this.colorScheme = options.colorScheme || 'classic'
    this.peaks = new Array(this.barCount).fill(0)
    this.peakHold = new Array(this.barCount).fill(0)
    this.smoothedData = new Array(this.barCount).fill(0)

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

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height)

    const barGap = 8
    const barWidth = (width - (this.barCount - 1) * barGap) / this.barCount
    const maxBarHeight = height - 4
    const segmentCount = 20 // Number of LED segments per bar
    const segmentGap = 2
    const segmentHeight = (maxBarHeight - (segmentCount - 1) * segmentGap) / segmentCount

    // Calculate frequency bands (logarithmic distribution)
    for (let i = 0; i < this.barCount; i++) {
      // Logarithmic frequency band mapping
      const lowFreq = Math.pow(2, i / this.barCount * 10) * 20 // 20Hz to ~20kHz
      const highFreq = Math.pow(2, (i + 1) / this.barCount * 10) * 20

      const lowBin = Math.floor(lowFreq / (22050 / this.dataArray.length))
      const highBin = Math.min(Math.floor(highFreq / (22050 / this.dataArray.length)), this.dataArray.length - 1)

      // Average energy in this frequency band
      let sum = 0
      let count = 0
      for (let j = lowBin; j <= highBin; j++) {
        sum += this.dataArray[j]
        count++
      }
      const rawValue = count > 0 ? sum / count / 255 : 0

      // Smooth the data
      this.smoothedData[i] = this.smoothedData[i] * 0.6 + rawValue * 0.4

      const value = this.smoothedData[i]
      const litSegments = Math.floor(value * segmentCount)

      // Update peak
      if (litSegments > this.peaks[i]) {
        this.peaks[i] = litSegments
        this.peakHold[i] = 0
      } else {
        this.peakHold[i]++
        if (this.peakHold[i] > 20) { // Hold for 20 frames
          this.peaks[i] = Math.max(0, this.peaks[i] - 0.5)
        }
      }

      const x = i * (barWidth + barGap)

      // Draw segments
      for (let seg = 0; seg < segmentCount; seg++) {
        const segY = height - 2 - (seg + 1) * (segmentHeight + segmentGap)

        // Determine segment color based on position (VU meter zones)
        const segPercent = seg / segmentCount
        let segColor: string
        if (segPercent < 0.6) {
          segColor = scheme.low // Green zone (0-60%)
        } else if (segPercent < 0.85) {
          segColor = scheme.mid // Yellow zone (60-85%)
        } else {
          segColor = scheme.high // Red zone (85-100%)
        }

        if (seg < litSegments) {
          // Lit segment
          this.ctx.fillStyle = segColor
          this.ctx.shadowBlur = 4
          this.ctx.shadowColor = segColor
        } else {
          // Unlit segment (dim)
          this.ctx.fillStyle = scheme.bg
          this.ctx.shadowBlur = 0
        }

        this.drawRoundedRect(x, segY, barWidth, segmentHeight, 2)
      }

      // Draw peak indicator
      const peakSeg = Math.floor(this.peaks[i])
      if (peakSeg > 0 && peakSeg < segmentCount) {
        const peakY = height - 2 - (peakSeg + 1) * (segmentHeight + segmentGap)
        this.ctx.fillStyle = scheme.peak
        this.ctx.shadowBlur = 6
        this.ctx.shadowColor = scheme.peak
        this.drawRoundedRect(x, peakY, barWidth, segmentHeight, 2)
      }
    }

    this.ctx.shadowBlur = 0
  }

  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath()
    this.ctx.moveTo(x + radius, y)
    this.ctx.lineTo(x + width - radius, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    this.ctx.lineTo(x + width, y + height - radius)
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    this.ctx.lineTo(x + radius, y + height)
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    this.ctx.lineTo(x, y + radius)
    this.ctx.quadraticCurveTo(x, y, x + radius, y)
    this.ctx.closePath()
    this.ctx.fill()
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
