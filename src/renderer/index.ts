import { captureAudio, AudioCaptureResult, getAudioDevices, findBlackHoleDevice } from './audio/capture'
import { SpectrumVisualizer } from './visualizers/spectrum'
import { WaveformVisualizer } from './visualizers/waveform'

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
    }
  }
}

interface Settings {
  position: string
  height: number
  opacity: number
  visualizerMode: 'spectrum' | 'waveform'
  audioDeviceId: string | null
  colorScheme: string
  barCount: number
  showPeaks: boolean
}

type EdgePosition = 'top' | 'bottom' | 'left' | 'right'

class AudioVisualizerApp {
  private container: HTMLElement
  private statusEl: HTMLElement
  private statusText: HTMLElement

  private audioCapture: AudioCaptureResult | null = null
  private spectrumVisualizer: SpectrumVisualizer | null = null
  private waveformVisualizer: WaveformVisualizer | null = null

  private currentMode: 'spectrum' | 'waveform' = 'spectrum'
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
      this.switchMode(mode as 'spectrum' | 'waveform')
    })

    window.electronAPI.onOpacityChanged((opacity) => {
      document.body.style.opacity = String(opacity)
    })

    window.electronAPI.onPositionChanged((position) => {
      this.currentPosition = position as EdgePosition
      this.applyRotation(this.currentPosition)
    })

    window.electronAPI.onColorSchemeChanged((scheme) => {
      this.setColorScheme(scheme)
    })
  }

  private setColorScheme(scheme: string): void {
    if (this.spectrumVisualizer) {
      this.spectrumVisualizer.setGradient(scheme)
    }
    if (this.waveformVisualizer) {
      // Map color schemes to waveform colors
      const colorMap: Record<string, string> = {
        classic: '#00ff00',
        blue: '#00ccff',
        purple: '#cc00ff',
        fire: '#ff6600',
        ice: '#00ffff',
        light: '#ffffff',
        dark: '#0f3460',
        rainbow: '#ff00ff'
      }
      const color = colorMap[scheme] || '#00ff00'
      this.waveformVisualizer.setColor(color)
      this.waveformVisualizer.setGlowColor(color)
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

    if (this.currentMode === 'spectrum') {
      this.spectrumVisualizer = new SpectrumVisualizer({
        container: this.container,
        barCount: this.settings?.barCount || 64,
        colorScheme: colorScheme,
        showPeaks: this.settings?.showPeaks ?? true
      })

      await this.spectrumVisualizer.init(
        this.audioCapture.analyser,
        this.audioCapture.audioContext
      )

      // Apply the color scheme after initialization
      this.spectrumVisualizer.setGradient(colorScheme)
    } else {
      // Map color schemes to waveform colors
      const colorMap: Record<string, string> = {
        classic: '#00ff00',
        blue: '#00ccff',
        purple: '#cc00ff',
        fire: '#ff6600',
        ice: '#00ffff',
        light: '#ffffff',
        dark: '#0f3460',
        rainbow: '#ff00ff'
      }
      const color = colorMap[colorScheme] || '#00ff00'

      this.waveformVisualizer = new WaveformVisualizer({
        container: this.container,
        color: color,
        glowColor: color,
        glowIntensity: 15
      })

      this.waveformVisualizer.init(this.audioCapture.analyser)
    }
  }

  private async switchMode(mode: 'spectrum' | 'waveform'): Promise<void> {
    if (mode === this.currentMode) return

    // Destroy current visualizer
    if (this.spectrumVisualizer) {
      this.spectrumVisualizer.destroy()
      this.spectrumVisualizer = null
    }
    if (this.waveformVisualizer) {
      this.waveformVisualizer.destroy()
      this.waveformVisualizer = null
    }

    this.currentMode = mode
    await this.initVisualizer()
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
