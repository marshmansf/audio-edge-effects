import AudioMotionAnalyzer from 'audiomotion-analyzer'

export interface SpectrumOptions {
  container: HTMLElement
  barCount?: number
  colorScheme?: string
  showPeaks?: boolean
  opacity?: number
}

// Color gradients for visualizer
const colorGradients: Record<string, { colorStops: { color: string; pos: number }[] }> = {
  classic: {
    colorStops: [
      { color: '#00ff00', pos: 0 },
      { color: '#00ff00', pos: 0.6 },
      { color: '#ffff00', pos: 0.8 },
      { color: '#ff0000', pos: 1 }
    ]
  },
  blue: {
    colorStops: [
      { color: '#0066ff', pos: 0 },
      { color: '#00ccff', pos: 0.5 },
      { color: '#ffffff', pos: 1 }
    ]
  },
  purple: {
    colorStops: [
      { color: '#6600ff', pos: 0 },
      { color: '#cc00ff', pos: 0.5 },
      { color: '#ff00cc', pos: 1 }
    ]
  },
  fire: {
    colorStops: [
      { color: '#ff0000', pos: 0 },
      { color: '#ff6600', pos: 0.5 },
      { color: '#ffcc00', pos: 1 }
    ]
  },
  ice: {
    colorStops: [
      { color: '#00ffff', pos: 0 },
      { color: '#0099ff', pos: 0.5 },
      { color: '#ffffff', pos: 1 }
    ]
  },
  light: {
    colorStops: [
      { color: '#ffffff', pos: 0 },
      { color: '#e0e0e0', pos: 0.5 },
      { color: '#b0b0b0', pos: 1 }
    ]
  },
  dark: {
    colorStops: [
      { color: '#1a1a2e', pos: 0 },
      { color: '#16213e', pos: 0.5 },
      { color: '#0f3460', pos: 1 }
    ]
  },
  rainbow: {
    colorStops: [
      { color: '#ff0000', pos: 0 },
      { color: '#ff8800', pos: 0.17 },
      { color: '#ffff00', pos: 0.33 },
      { color: '#00ff00', pos: 0.5 },
      { color: '#0088ff', pos: 0.67 },
      { color: '#0000ff', pos: 0.83 },
      { color: '#ff00ff', pos: 1 }
    ]
  }
}

export class SpectrumVisualizer {
  private analyzer: AudioMotionAnalyzer | null = null
  private container: HTMLElement

  constructor(options: SpectrumOptions) {
    this.container = options.container
  }

  async init(audioSource: AnalyserNode | AudioNode, audioCtx: AudioContext): Promise<void> {
    // Register custom gradients
    const tempContainer = document.createElement('div')
    tempContainer.style.width = '100px'
    tempContainer.style.height = '100px'
    document.body.appendChild(tempContainer)

    this.analyzer = new AudioMotionAnalyzer(this.container, {
      audioCtx,
      connectSpeakers: false,
      // Visual style - WinAmp inspired with high bar count
      mode: 10, // 1/24th octave bands (~240 bars) - highest resolution
      barSpace: 0.1,
      ledBars: false,
      lumiBars: false,
      reflexRatio: 0,
      reflexAlpha: 0,
      showBgColor: false,
      overlay: true,
      bgAlpha: 0,
      // Frequency range
      minFreq: 20,
      maxFreq: 20000,
      // Higher FFT for more frequency resolution
      fftSize: 8192,
      // Scale
      linearAmplitude: false,
      linearBoost: 1.5,
      // Smoothing and response
      smoothing: 0.65,
      // Peaks
      showPeaks: true,
      peakLine: false,
      // Labels
      showScaleX: false,
      showScaleY: false,
      // Mirror/stereo
      mirror: 0,
      stereo: false,
      // Gradient
      gradient: 'classic'
    })

    // Register custom gradients
    for (const [name, gradient] of Object.entries(colorGradients)) {
      this.analyzer.registerGradient(name, gradient)
    }

    // Set the classic gradient
    this.analyzer.gradient = 'classic'

    // Connect the audio source
    this.analyzer.connectInput(audioSource)

    document.body.removeChild(tempContainer)
  }

  setGradient(name: string): void {
    if (this.analyzer && colorGradients[name]) {
      this.analyzer.gradient = name
    }
  }

  setBarCount(count: number): void {
    if (this.analyzer) {
      // Adjust mode based on bar count
      // Mode 6 = 1/6th octave (~64 bars)
      // Mode 4 = 1/4th octave (~48 bars)
      // Mode 3 = 1/3rd octave (~30 bars)
      if (count >= 64) {
        this.analyzer.mode = 6
      } else if (count >= 48) {
        this.analyzer.mode = 4
      } else {
        this.analyzer.mode = 3
      }
    }
  }

  setShowPeaks(show: boolean): void {
    if (this.analyzer) {
      this.analyzer.showPeaks = show
    }
  }

  destroy(): void {
    if (this.analyzer) {
      this.analyzer.destroy()
      this.analyzer = null
    }
  }

  getAnalyzer(): AudioMotionAnalyzer | null {
    return this.analyzer
  }
}
