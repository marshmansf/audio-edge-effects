import { captureAudio, AudioCaptureResult, getAudioDevices, findBlackHoleDevice } from './audio/capture'
import { SpectrumVisualizer } from './visualizers/spectrum'
import { SpectrumCellsVisualizer } from './visualizers/spectrum-cells'
import { SpectrumBarsVisualizer } from './visualizers/spectrum-bars'
import { SpectrumCircularVisualizer } from './visualizers/spectrum-circular'
import { WaveformVisualizer } from './visualizers/waveform'
import { WaveformBarsVisualizer } from './visualizers/waveform-bars'
import { WaveformGlowVisualizer } from './visualizers/waveform-glow'
import { WaveformBandsVisualizer } from './visualizers/waveform-bands'
import { WaveformFilledVisualizer } from './visualizers/waveform-filled'
import { SpectrogramVisualizer } from './visualizers/spectrogram'
import { EnergyBarsVisualizer } from './visualizers/energy-bars'
import { BeatPulseVisualizer } from './visualizers/beat-pulse'
import { ParticlesVisualizer } from './visualizers/particles'
import { PlasmaVisualizer } from './visualizers/plasma'
import { TerrainVisualizer } from './visualizers/terrain'

// Type definitions for Electron API exposed via preload
declare global {
  interface Window {
    electronAPI: {
      getSettings: () => Promise<Settings>
      setSetting: (key: string, value: unknown) => Promise<boolean>
      onVisualizerModeChanged: (callback: (mode: string) => void) => void
      onOpacityChanged: (callback: (opacity: number) => void) => void
      onPositionChanged: (callback: (position: string) => void) => void
      onColorSchemeChanged: (callback: (scheme: string) => void) => void
      onDensityChanged: (callback: (density: number) => void) => void
    }
  }
}

type VisualizerMode =
  | 'spectrum' | 'spectrum-cells' | 'spectrum-bars' | 'spectrum-circular'
  | 'waveform' | 'waveform-bars' | 'waveform-glow' | 'waveform-bands' | 'waveform-filled'
  | 'spectrogram' | 'energy-bars' | 'beat-pulse' | 'particles' | 'plasma' | 'terrain'

interface Settings {
  position: string
  height: number
  opacity: number
  visualizerMode: VisualizerMode
  audioDeviceId: string | null
  colorScheme: string
  density: number
  showPeaks: boolean
}

type EdgePosition = 'top' | 'bottom' | 'left' | 'right'

// Color map for waveform visualizers
const waveformColorMap: Record<string, string> = {
  classic: '#00ff00',
  blue: '#00ccff',
  purple: '#cc00ff',
  fire: '#ff6600',
  ice: '#00ffff',
  light: '#ffffff',
  dark: '#0f3460',
  rainbow: '#ff00ff'
}

class AudioVisualizerApp {
  private container: HTMLElement
  private statusEl: HTMLElement
  private statusText: HTMLElement

  private audioCapture: AudioCaptureResult | null = null
  private spectrumVisualizer: SpectrumVisualizer | null = null
  private spectrumCellsVisualizer: SpectrumCellsVisualizer | null = null
  private spectrumBarsVisualizer: SpectrumBarsVisualizer | null = null
  private spectrumCircularVisualizer: SpectrumCircularVisualizer | null = null
  private waveformVisualizer: WaveformVisualizer | null = null
  private waveformBarsVisualizer: WaveformBarsVisualizer | null = null
  private waveformGlowVisualizer: WaveformGlowVisualizer | null = null
  private waveformBandsVisualizer: WaveformBandsVisualizer | null = null
  private waveformFilledVisualizer: WaveformFilledVisualizer | null = null
  private spectrogramVisualizer: SpectrogramVisualizer | null = null
  private energyBarsVisualizer: EnergyBarsVisualizer | null = null
  private beatPulseVisualizer: BeatPulseVisualizer | null = null
  private particlesVisualizer: ParticlesVisualizer | null = null
  private plasmaVisualizer: PlasmaVisualizer | null = null
  private terrainVisualizer: TerrainVisualizer | null = null

  private currentMode: VisualizerMode = 'spectrum'
  private currentPosition: EdgePosition = 'bottom'
  private settings: Settings | null = null

  constructor() {
    this.container = document.getElementById('visualizer-container')!
    this.statusEl = document.getElementById('status')!
    this.statusText = document.getElementById('status-text')!
  }

  async init(): Promise<void> {
    this.showStatus('Initializing...')

    try {
      // Load settings
      this.settings = await window.electronAPI.getSettings()
      this.currentMode = this.settings.visualizerMode
      this.currentPosition = this.settings.position as EdgePosition

      // Set up IPC listeners
      this.setupIPCListeners()

      // Apply initial rotation
      this.applyRotation(this.currentPosition)

      // Check for audio devices
      const devices = await getAudioDevices()
      console.log('Available audio devices:', devices.map(d => d.label))

      const blackhole = await findBlackHoleDevice()
      if (!blackhole) {
        this.showStatus('No BlackHole device found. Please install BlackHole and configure Multi-Output Device.')
        return
      }

      this.showStatus(`Connecting to ${blackhole.label}...`)

      // Capture audio
      this.audioCapture = await captureAudio(
        this.settings.audioDeviceId || blackhole.deviceId
      )

      // Initialize visualizer
      await this.initVisualizer()

      this.hideStatus()
    } catch (error) {
      console.error('Failed to initialize:', error)
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          this.showStatus('Microphone permission denied. Please allow access in System Preferences.')
        } else if (error.name === 'NotFoundError') {
          this.showStatus('No audio input device found. Please check your audio configuration.')
        } else {
          this.showStatus(`Error: ${error.message}`)
        }
      }
    }
  }

  private setupIPCListeners(): void {
    window.electronAPI.onVisualizerModeChanged((mode) => {
      this.switchMode(mode as VisualizerMode)
    })

    window.electronAPI.onOpacityChanged((opacity) => {
      if (this.settings) {
        this.settings.opacity = opacity
      }
      document.body.style.opacity = String(opacity)
    })

    window.electronAPI.onPositionChanged((position) => {
      this.currentPosition = position as EdgePosition
      if (this.settings) {
        this.settings.position = position
      }
      this.applyRotation(this.currentPosition)
      // Reinitialize visualizer to handle dimension changes properly
      this.destroyAllVisualizers()
      this.initVisualizer()
    })

    window.electronAPI.onColorSchemeChanged((scheme) => {
      if (this.settings) {
        this.settings.colorScheme = scheme
      }
      this.setColorScheme(scheme)
    })

    window.electronAPI.onDensityChanged((density) => {
      if (this.settings) {
        this.settings.density = density
      }
      this.destroyAllVisualizers()
      this.initVisualizer()
    })
  }

  private setColorScheme(scheme: string): void {
    const color = waveformColorMap[scheme] || '#00ff00'

    if (this.spectrumVisualizer) {
      this.spectrumVisualizer.setGradient(scheme)
    }
    if (this.spectrumCellsVisualizer) {
      this.spectrumCellsVisualizer.setColorScheme(scheme)
    }
    if (this.spectrumBarsVisualizer) {
      this.spectrumBarsVisualizer.setColorScheme(scheme)
    }
    if (this.spectrumCircularVisualizer) {
      this.spectrumCircularVisualizer.setColorScheme(scheme)
    }
    if (this.waveformVisualizer) {
      this.waveformVisualizer.setColor(color)
      this.waveformVisualizer.setGlowColor(color)
    }
    if (this.waveformBarsVisualizer) {
      this.waveformBarsVisualizer.setColorScheme(scheme)
    }
    if (this.waveformGlowVisualizer) {
      this.waveformGlowVisualizer.setColorScheme(scheme)
    }
    if (this.waveformBandsVisualizer) {
      this.waveformBandsVisualizer.setColorScheme(scheme)
    }
    if (this.waveformFilledVisualizer) {
      this.waveformFilledVisualizer.setColorScheme(scheme)
    }
    if (this.spectrogramVisualizer) {
      this.spectrogramVisualizer.setColorScheme(scheme)
    }
    if (this.energyBarsVisualizer) {
      this.energyBarsVisualizer.setColorScheme(scheme)
    }
    if (this.beatPulseVisualizer) {
      this.beatPulseVisualizer.setColorScheme(scheme)
    }
    if (this.particlesVisualizer) {
      this.particlesVisualizer.setColorScheme(scheme)
    }
    if (this.plasmaVisualizer) {
      this.plasmaVisualizer.setColorScheme(scheme)
    }
    if (this.terrainVisualizer) {
      this.terrainVisualizer.setColorScheme(scheme)
    }
  }

  private applyRotation(position: EdgePosition): void {
    // Remove all position classes
    this.container.classList.remove('position-top', 'position-bottom', 'position-left', 'position-right')

    // Add current position class
    this.container.classList.add(`position-${position}`)

    // Apply CSS transforms based on position
    // Bottom: normal (no transform)
    // Top: flip upside down (scaleY(-1))
    // Left: rotate 90° clockwise, bars go right
    // Right: rotate 90° counter-clockwise, bars go left
    switch (position) {
      case 'bottom':
        this.container.style.transform = 'none'
        break
      case 'top':
        this.container.style.transform = 'scaleY(-1)'
        break
      case 'left':
        this.container.style.transform = 'rotate(90deg)'
        break
      case 'right':
        this.container.style.transform = 'rotate(-90deg)'
        break
    }
  }

  private async initVisualizer(): Promise<void> {
    if (!this.audioCapture) return

    // Clear container
    this.container.innerHTML = ''

    const colorScheme = this.settings?.colorScheme || 'classic'
    const color = waveformColorMap[colorScheme] || '#00ff00'
    const density = this.settings?.density || 256

    switch (this.currentMode) {
      case 'spectrum':
        this.spectrumVisualizer = new SpectrumVisualizer({
          container: this.container,
          barCount: density,
          colorScheme: colorScheme,
          showPeaks: this.settings?.showPeaks ?? true
        })
        await this.spectrumVisualizer.init(
          this.audioCapture.analyser,
          this.audioCapture.audioContext
        )
        this.spectrumVisualizer.setGradient(colorScheme)
        break

      case 'spectrum-cells':
        this.spectrumCellsVisualizer = new SpectrumCellsVisualizer({
          container: this.container,
          barCount: density,
          colorScheme: colorScheme
        })
        this.spectrumCellsVisualizer.init(this.audioCapture.analyser)
        break

      case 'spectrum-bars':
        this.spectrumBarsVisualizer = new SpectrumBarsVisualizer({
          container: this.container,
          barCount: density,
          colorScheme: colorScheme
        })
        this.spectrumBarsVisualizer.init(this.audioCapture.analyser)
        break

      case 'waveform':
        this.waveformVisualizer = new WaveformVisualizer({
          container: this.container,
          color: color,
          glowColor: color,
          glowIntensity: 15
        })
        this.waveformVisualizer.init(this.audioCapture.analyser)
        break

      case 'waveform-bars':
        this.waveformBarsVisualizer = new WaveformBarsVisualizer({
          container: this.container,
          barCount: density,
          colorScheme: colorScheme
        })
        this.waveformBarsVisualizer.init(this.audioCapture.analyser)
        break

      case 'waveform-glow':
        this.waveformGlowVisualizer = new WaveformGlowVisualizer({
          container: this.container,
          colorScheme: colorScheme
        })
        this.waveformGlowVisualizer.init(this.audioCapture.analyser)
        break

      case 'waveform-bands':
        this.waveformBandsVisualizer = new WaveformBandsVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          bandCount: Math.max(20, Math.floor(density / 4))
        })
        this.waveformBandsVisualizer.init(this.audioCapture.analyser)
        break

      case 'spectrum-circular':
        this.spectrumCircularVisualizer = new SpectrumCircularVisualizer({
          container: this.container,
          barCount: Math.min(density, 180),
          colorScheme: colorScheme
        })
        this.spectrumCircularVisualizer.init(this.audioCapture.analyser)
        break

      case 'waveform-filled':
        this.waveformFilledVisualizer = new WaveformFilledVisualizer({
          container: this.container,
          colorScheme: colorScheme
        })
        this.waveformFilledVisualizer.init(this.audioCapture.analyser)
        break

      case 'spectrogram':
        this.spectrogramVisualizer = new SpectrogramVisualizer({
          container: this.container,
          colorScheme: colorScheme
        })
        this.spectrogramVisualizer.init(this.audioCapture.analyser)
        break

      case 'energy-bars':
        this.energyBarsVisualizer = new EnergyBarsVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          barCount: Math.max(4, Math.floor(density / 16))
        })
        this.energyBarsVisualizer.init(this.audioCapture.analyser)
        break

      case 'beat-pulse':
        this.beatPulseVisualizer = new BeatPulseVisualizer({
          container: this.container,
          colorScheme: colorScheme
        })
        this.beatPulseVisualizer.init(this.audioCapture.analyser)
        break

      case 'particles':
        this.particlesVisualizer = new ParticlesVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          maxParticles: density * 2
        })
        this.particlesVisualizer.init(this.audioCapture.analyser)
        break

      case 'plasma':
        this.plasmaVisualizer = new PlasmaVisualizer({
          container: this.container,
          colorScheme: colorScheme
        })
        this.plasmaVisualizer.init(this.audioCapture.analyser)
        break

      case 'terrain':
        this.terrainVisualizer = new TerrainVisualizer({
          container: this.container,
          colorScheme: colorScheme
        })
        this.terrainVisualizer.init(this.audioCapture.analyser)
        break
    }
  }

  private async switchMode(mode: VisualizerMode): Promise<void> {
    if (mode === this.currentMode) return

    // Destroy all visualizers
    this.destroyAllVisualizers()

    this.currentMode = mode
    await this.initVisualizer()
  }

  private destroyAllVisualizers(): void {
    if (this.spectrumVisualizer) {
      this.spectrumVisualizer.destroy()
      this.spectrumVisualizer = null
    }
    if (this.spectrumCellsVisualizer) {
      this.spectrumCellsVisualizer.destroy()
      this.spectrumCellsVisualizer = null
    }
    if (this.spectrumBarsVisualizer) {
      this.spectrumBarsVisualizer.destroy()
      this.spectrumBarsVisualizer = null
    }
    if (this.spectrumCircularVisualizer) {
      this.spectrumCircularVisualizer.destroy()
      this.spectrumCircularVisualizer = null
    }
    if (this.waveformVisualizer) {
      this.waveformVisualizer.destroy()
      this.waveformVisualizer = null
    }
    if (this.waveformBarsVisualizer) {
      this.waveformBarsVisualizer.destroy()
      this.waveformBarsVisualizer = null
    }
    if (this.waveformGlowVisualizer) {
      this.waveformGlowVisualizer.destroy()
      this.waveformGlowVisualizer = null
    }
    if (this.waveformBandsVisualizer) {
      this.waveformBandsVisualizer.destroy()
      this.waveformBandsVisualizer = null
    }
    if (this.waveformFilledVisualizer) {
      this.waveformFilledVisualizer.destroy()
      this.waveformFilledVisualizer = null
    }
    if (this.spectrogramVisualizer) {
      this.spectrogramVisualizer.destroy()
      this.spectrogramVisualizer = null
    }
    if (this.energyBarsVisualizer) {
      this.energyBarsVisualizer.destroy()
      this.energyBarsVisualizer = null
    }
    if (this.beatPulseVisualizer) {
      this.beatPulseVisualizer.destroy()
      this.beatPulseVisualizer = null
    }
    if (this.particlesVisualizer) {
      this.particlesVisualizer.destroy()
      this.particlesVisualizer = null
    }
    if (this.plasmaVisualizer) {
      this.plasmaVisualizer.destroy()
      this.plasmaVisualizer = null
    }
    if (this.terrainVisualizer) {
      this.terrainVisualizer.destroy()
      this.terrainVisualizer = null
    }
  }

  private showStatus(message: string): void {
    this.statusText.textContent = message
    this.statusEl.classList.remove('hidden')
  }

  private hideStatus(): void {
    this.statusEl.classList.add('hidden')
  }
}

// Start the app
const app = new AudioVisualizerApp()
app.init()
