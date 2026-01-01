import { captureAudio, AudioCaptureResult, getAudioDevices, findBlackHoleDevice } from './audio/capture'
import { SpectrumVisualizer } from './visualizers/spectrum'
import { SpectrumCellsVisualizer } from './visualizers/spectrum-cells'
import { SpectrumBarsVisualizer } from './visualizers/spectrum-bars'
import { SpectrumCircularVisualizer } from './visualizers/spectrum-circular'
import { SpectrumFlameVisualizer } from './visualizers/spectrum-flame'
import { SpectrumWaterfallVisualizer } from './visualizers/spectrum-waterfall'
import { SpectrumPeaksVisualizer } from './visualizers/spectrum-peaks'
import { SpectrumStackVisualizer } from './visualizers/spectrum-stack'
import { WaveformVisualizer } from './visualizers/waveform'
import { WaveformBarsVisualizer } from './visualizers/waveform-bars'
import { WaveformGlowVisualizer } from './visualizers/waveform-glow'
import { WaveformBandsVisualizer } from './visualizers/waveform-bands'
import { WaveformFilledVisualizer } from './visualizers/waveform-filled'
import { WaveformRibbonVisualizer } from './visualizers/waveform-ribbon'
import { WaveformLissajousVisualizer } from './visualizers/waveform-lissajous'
import { WaveformPhaseVisualizer } from './visualizers/waveform-phase'
import { SpectrogramVisualizer } from './visualizers/spectrogram'
import { EnergyBarsVisualizer } from './visualizers/energy-bars'
import { BeatPulseVisualizer } from './visualizers/beat-pulse'
import { ParticlesVisualizer } from './visualizers/particles'
import { PlasmaVisualizer } from './visualizers/plasma'
import { TerrainVisualizer } from './visualizers/terrain'
import { PolygonMorphVisualizer } from './visualizers/polygon-morph'
import { SpiralVisualizer } from './visualizers/spiral'
import { HexagonGridVisualizer } from './visualizers/hexagon-grid'
import { ConstellationVisualizer } from './visualizers/constellation'
import { MandalaVisualizer } from './visualizers/mandala'
import { BouncingBallsVisualizer } from './visualizers/bouncing-balls'
import { PendulumWaveVisualizer } from './visualizers/pendulum-wave'
import { StringVibrationVisualizer } from './visualizers/string-vibration'
import { LiquidVisualizer } from './visualizers/liquid'
import { GravityWellsVisualizer } from './visualizers/gravity-wells'
import { BreathingCircleVisualizer } from './visualizers/breathing-circle'
import { LightningVisualizer } from './visualizers/lightning'
import { FireVisualizer } from './visualizers/fire'
import { SmokeMistVisualizer } from './visualizers/smoke-mist'
import { VuMetersVisualizer } from './visualizers/vu-meters'
import { LedMatrixVisualizer } from './visualizers/led-matrix'
import { OscilloscopeCrtVisualizer } from './visualizers/oscilloscope-crt'
import { NeonSignsVisualizer } from './visualizers/neon-signs'
import { AsciiArtVisualizer } from './visualizers/ascii-art'
import { NoiseFieldVisualizer } from './visualizers/noise-field'
import { ColorFieldVisualizer } from './visualizers/color-field'
import { GlitchVisualizer } from './visualizers/glitch'
import { MoireVisualizer } from './visualizers/moire'

// Type definitions for Electron API exposed via preload
declare global {
  interface Window {
    electronAPI: {
      getSettings: () => Promise<Settings>
      setSetting: (key: string, value: unknown) => Promise<boolean>
      getScreenSize: () => Promise<{ width: number; height: number }>
      togglePosition: (position: string) => Promise<string[]>
      getWindowPosition: () => string
      onVisualizerModeChanged: (callback: (mode: string) => void) => void
      onOpacityChanged: (callback: (opacity: number) => void) => void
      onColorSchemeChanged: (callback: (scheme: string) => void) => void
      onDensityChanged: (callback: (density: number) => void) => void
    }
  }
}

type VisualizerMode =
  // Spectrum
  | 'spectrum' | 'spectrum-cells' | 'spectrum-bars' | 'spectrum-circular'
  | 'spectrum-flame' | 'spectrum-waterfall' | 'spectrum-peaks' | 'spectrum-stack'
  // Waveform
  | 'waveform' | 'waveform-bars' | 'waveform-glow' | 'waveform-bands' | 'waveform-filled'
  | 'waveform-ribbon' | 'waveform-lissajous' | 'waveform-phase'
  // Effects
  | 'spectrogram' | 'energy-bars' | 'beat-pulse' | 'particles' | 'plasma' | 'terrain'
  // Geometric
  | 'polygon-morph' | 'spiral' | 'hexagon-grid' | 'constellation' | 'mandala'
  // Physics
  | 'bouncing-balls' | 'pendulum-wave' | 'string-vibration' | 'liquid' | 'gravity-wells'
  // Organic
  | 'breathing-circle' | 'lightning' | 'fire' | 'smoke-mist'
  // Retro
  | 'vu-meters' | 'led-matrix' | 'oscilloscope-crt' | 'neon-signs' | 'ascii-art'
  // Abstract
  | 'noise-field' | 'color-field' | 'glitch' | 'moire'

interface Settings {
  position: string
  positions: string[]
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
  // Spectrum visualizers
  private spectrumVisualizer: SpectrumVisualizer | null = null
  private spectrumCellsVisualizer: SpectrumCellsVisualizer | null = null
  private spectrumBarsVisualizer: SpectrumBarsVisualizer | null = null
  private spectrumCircularVisualizer: SpectrumCircularVisualizer | null = null
  private spectrumFlameVisualizer: SpectrumFlameVisualizer | null = null
  private spectrumWaterfallVisualizer: SpectrumWaterfallVisualizer | null = null
  private spectrumPeaksVisualizer: SpectrumPeaksVisualizer | null = null
  private spectrumStackVisualizer: SpectrumStackVisualizer | null = null
  // Waveform visualizers
  private waveformVisualizer: WaveformVisualizer | null = null
  private waveformBarsVisualizer: WaveformBarsVisualizer | null = null
  private waveformGlowVisualizer: WaveformGlowVisualizer | null = null
  private waveformBandsVisualizer: WaveformBandsVisualizer | null = null
  private waveformFilledVisualizer: WaveformFilledVisualizer | null = null
  private waveformRibbonVisualizer: WaveformRibbonVisualizer | null = null
  private waveformLissajousVisualizer: WaveformLissajousVisualizer | null = null
  private waveformPhaseVisualizer: WaveformPhaseVisualizer | null = null
  // Effects visualizers
  private spectrogramVisualizer: SpectrogramVisualizer | null = null
  private energyBarsVisualizer: EnergyBarsVisualizer | null = null
  private beatPulseVisualizer: BeatPulseVisualizer | null = null
  private particlesVisualizer: ParticlesVisualizer | null = null
  private plasmaVisualizer: PlasmaVisualizer | null = null
  private terrainVisualizer: TerrainVisualizer | null = null
  // Geometric visualizers
  private polygonMorphVisualizer: PolygonMorphVisualizer | null = null
  private spiralVisualizer: SpiralVisualizer | null = null
  private hexagonGridVisualizer: HexagonGridVisualizer | null = null
  private constellationVisualizer: ConstellationVisualizer | null = null
  private mandalaVisualizer: MandalaVisualizer | null = null
  // Physics visualizers
  private bouncingBallsVisualizer: BouncingBallsVisualizer | null = null
  private pendulumWaveVisualizer: PendulumWaveVisualizer | null = null
  private stringVibrationVisualizer: StringVibrationVisualizer | null = null
  private liquidVisualizer: LiquidVisualizer | null = null
  private gravityWellsVisualizer: GravityWellsVisualizer | null = null
  // Organic visualizers
  private breathingCircleVisualizer: BreathingCircleVisualizer | null = null
  private lightningVisualizer: LightningVisualizer | null = null
  private fireVisualizer: FireVisualizer | null = null
  private smokeMistVisualizer: SmokeMistVisualizer | null = null
  // Retro visualizers
  private vuMetersVisualizer: VuMetersVisualizer | null = null
  private ledMatrixVisualizer: LedMatrixVisualizer | null = null
  private oscilloscopeCrtVisualizer: OscilloscopeCrtVisualizer | null = null
  private neonSignsVisualizer: NeonSignsVisualizer | null = null
  private asciiArtVisualizer: AsciiArtVisualizer | null = null
  // Abstract visualizers
  private noiseFieldVisualizer: NoiseFieldVisualizer | null = null
  private colorFieldVisualizer: ColorFieldVisualizer | null = null
  private glitchVisualizer: GlitchVisualizer | null = null
  private moireVisualizer: MoireVisualizer | null = null

  private currentMode: VisualizerMode = 'spectrum'
  private currentPosition: EdgePosition = 'bottom'
  private settings: Settings | null = null
  private screenSize: { width: number; height: number } = { width: 1920, height: 1080 }

  constructor() {
    this.container = document.getElementById('visualizer-container')!
    this.statusEl = document.getElementById('status')!
    this.statusText = document.getElementById('status-text')!
  }

  async init(): Promise<void> {
    try {
      // Load settings and screen size
      this.settings = await window.electronAPI.getSettings()
      this.screenSize = await window.electronAPI.getScreenSize()
      this.currentMode = this.settings.visualizerMode

      // Get this window's position from URL query parameter (each window has a fixed position)
      this.currentPosition = window.electronAPI.getWindowPosition() as EdgePosition

      // Set up IPC listeners
      this.setupIPCListeners()

      // Apply initial rotation based on this window's fixed position
      this.applyRotation(this.currentPosition)

      // Check for audio devices
      const devices = await getAudioDevices()
      console.log('Available audio devices:', devices.map(d => d.label))

      const blackhole = await findBlackHoleDevice()
      if (!blackhole) {
        this.showStatus('No BlackHole device found. Please install BlackHole and configure Multi-Output Device.')
        return
      }

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

    // Note: onPositionChanged removed - each window now has a fixed position
    // Position is determined at window creation via URL query parameter

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
    // New Spectrum visualizers
    if (this.spectrumFlameVisualizer) {
      this.spectrumFlameVisualizer.setColorScheme(scheme)
    }
    if (this.spectrumWaterfallVisualizer) {
      this.spectrumWaterfallVisualizer.setColorScheme(scheme)
    }
    if (this.spectrumPeaksVisualizer) {
      this.spectrumPeaksVisualizer.setColorScheme(scheme)
    }
    if (this.spectrumStackVisualizer) {
      this.spectrumStackVisualizer.setColorScheme(scheme)
    }
    // New Waveform visualizers
    if (this.waveformRibbonVisualizer) {
      this.waveformRibbonVisualizer.setColorScheme(scheme)
    }
    if (this.waveformLissajousVisualizer) {
      this.waveformLissajousVisualizer.setColorScheme(scheme)
    }
    if (this.waveformPhaseVisualizer) {
      this.waveformPhaseVisualizer.setColorScheme(scheme)
    }
    // Geometric visualizers
    if (this.polygonMorphVisualizer) {
      this.polygonMorphVisualizer.setColorScheme(scheme)
    }
    if (this.spiralVisualizer) {
      this.spiralVisualizer.setColorScheme(scheme)
    }
    if (this.hexagonGridVisualizer) {
      this.hexagonGridVisualizer.setColorScheme(scheme)
    }
    if (this.constellationVisualizer) {
      this.constellationVisualizer.setColorScheme(scheme)
    }
    if (this.mandalaVisualizer) {
      this.mandalaVisualizer.setColorScheme(scheme)
    }
    // Physics visualizers
    if (this.bouncingBallsVisualizer) {
      this.bouncingBallsVisualizer.setColorScheme(scheme)
    }
    if (this.pendulumWaveVisualizer) {
      this.pendulumWaveVisualizer.setColorScheme(scheme)
    }
    if (this.stringVibrationVisualizer) {
      this.stringVibrationVisualizer.setColorScheme(scheme)
    }
    if (this.liquidVisualizer) {
      this.liquidVisualizer.setColorScheme(scheme)
    }
    if (this.gravityWellsVisualizer) {
      this.gravityWellsVisualizer.setColorScheme(scheme)
    }
    // Organic visualizers
    if (this.breathingCircleVisualizer) {
      this.breathingCircleVisualizer.setColorScheme(scheme)
    }
    if (this.lightningVisualizer) {
      this.lightningVisualizer.setColorScheme(scheme)
    }
    if (this.fireVisualizer) {
      this.fireVisualizer.setColorScheme(scheme)
    }
    if (this.smokeMistVisualizer) {
      this.smokeMistVisualizer.setColorScheme(scheme)
    }
    // Retro visualizers
    if (this.vuMetersVisualizer) {
      this.vuMetersVisualizer.setColorScheme(scheme)
    }
    if (this.ledMatrixVisualizer) {
      this.ledMatrixVisualizer.setColorScheme(scheme)
    }
    if (this.oscilloscopeCrtVisualizer) {
      this.oscilloscopeCrtVisualizer.setColorScheme(scheme)
    }
    if (this.neonSignsVisualizer) {
      this.neonSignsVisualizer.setColorScheme(scheme)
    }
    if (this.asciiArtVisualizer) {
      this.asciiArtVisualizer.setColorScheme(scheme)
    }
    // Abstract visualizers
    if (this.noiseFieldVisualizer) {
      this.noiseFieldVisualizer.setColorScheme(scheme)
    }
    if (this.colorFieldVisualizer) {
      this.colorFieldVisualizer.setColorScheme(scheme)
    }
    if (this.glitchVisualizer) {
      this.glitchVisualizer.setColorScheme(scheme)
    }
    if (this.moireVisualizer) {
      this.moireVisualizer.setColorScheme(scheme)
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
    const baseDensity = this.settings?.density || 256

    // Scale density for left/right positions to maintain visual equivalence
    // Left/right edges span screen height, top/bottom span screen width
    const density = (this.currentPosition === 'left' || this.currentPosition === 'right')
      ? Math.round(baseDensity * this.screenSize.height / this.screenSize.width)
      : baseDensity

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
          barCount: Math.min(density * 2, 360), // doubled density for "Spectrum Tubes"
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

      // New Spectrum visualizers
      case 'spectrum-flame':
        this.spectrumFlameVisualizer = new SpectrumFlameVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          barCount: density
        })
        this.spectrumFlameVisualizer.init(this.audioCapture.analyser)
        break

      case 'spectrum-waterfall':
        this.spectrumWaterfallVisualizer = new SpectrumWaterfallVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          resolution: density
        })
        this.spectrumWaterfallVisualizer.init(this.audioCapture.analyser)
        break

      case 'spectrum-peaks':
        this.spectrumPeaksVisualizer = new SpectrumPeaksVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          barCount: density
        })
        this.spectrumPeaksVisualizer.init(this.audioCapture.analyser)
        break

      case 'spectrum-stack':
        this.spectrumStackVisualizer = new SpectrumStackVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          resolution: density
        })
        this.spectrumStackVisualizer.init(this.audioCapture.analyser)
        break

      // New Waveform visualizers
      case 'waveform-ribbon':
        this.waveformRibbonVisualizer = new WaveformRibbonVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          ribbonCount: Math.max(5, Math.floor(density / 6))
        })
        this.waveformRibbonVisualizer.init(this.audioCapture.analyser)
        break

      case 'waveform-lissajous':
        this.waveformLissajousVisualizer = new WaveformLissajousVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          detail: Math.max(1, Math.floor(density / 20)),
          position: this.currentPosition
        })
        this.waveformLissajousVisualizer.init(this.audioCapture.analyser)
        break

      case 'waveform-phase':
        this.waveformPhaseVisualizer = new WaveformPhaseVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          bandCount: Math.max(3, Math.floor(density / 10))
        })
        this.waveformPhaseVisualizer.init(this.audioCapture.analyser)
        break

      // Geometric visualizers
      case 'polygon-morph':
        this.polygonMorphVisualizer = new PolygonMorphVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          ringCount: Math.max(2, Math.floor(density / 16)),
          position: this.currentPosition
        })
        this.polygonMorphVisualizer.init(this.audioCapture.analyser)
        break

      case 'spiral':
        this.spiralVisualizer = new SpiralVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          pointCount: density * 8,
          position: this.currentPosition
        })
        this.spiralVisualizer.init(this.audioCapture.analyser)
        break

      case 'hexagon-grid':
        this.hexagonGridVisualizer = new HexagonGridVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          hexSize: Math.max(10, 40 - density / 4)
        })
        this.hexagonGridVisualizer.init(this.audioCapture.analyser)
        break

      case 'constellation':
        this.constellationVisualizer = new ConstellationVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          starCount: density
        })
        this.constellationVisualizer.init(this.audioCapture.analyser)
        break

      case 'mandala':
        this.mandalaVisualizer = new MandalaVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          symmetry: Math.max(4, Math.floor(density / 8)),
          position: this.currentPosition
        })
        this.mandalaVisualizer.init(this.audioCapture.analyser)
        break

      // Physics visualizers
      case 'bouncing-balls':
        this.bouncingBallsVisualizer = new BouncingBallsVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          maxBalls: Math.max(10, density)
        })
        this.bouncingBallsVisualizer.init(this.audioCapture.analyser)
        break

      case 'pendulum-wave':
        this.pendulumWaveVisualizer = new PendulumWaveVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          pendulumCount: Math.max(8, Math.floor(density / 4))
        })
        this.pendulumWaveVisualizer.init(this.audioCapture.analyser)
        break

      case 'string-vibration':
        this.stringVibrationVisualizer = new StringVibrationVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          stringCount: Math.max(3, Math.floor(density / 10))
        })
        this.stringVibrationVisualizer.init(this.audioCapture.analyser)
        break

      case 'liquid':
        this.liquidVisualizer = new LiquidVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          resolution: density
        })
        this.liquidVisualizer.init(this.audioCapture.analyser)
        break

      case 'gravity-wells':
        this.gravityWellsVisualizer = new GravityWellsVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          maxParticles: density * 5
        })
        this.gravityWellsVisualizer.init(this.audioCapture.analyser)
        break

      // Organic visualizers
      case 'breathing-circle':
        this.breathingCircleVisualizer = new BreathingCircleVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          tentacleCount: density,
          position: this.currentPosition
        })
        this.breathingCircleVisualizer.init(this.audioCapture.analyser)
        break

      case 'lightning':
        this.lightningVisualizer = new LightningVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          maxBolts: Math.max(2, Math.floor(density / 10))
        })
        this.lightningVisualizer.init(this.audioCapture.analyser)
        break

      case 'fire':
        this.fireVisualizer = new FireVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          maxParticles: density * 4
        })
        this.fireVisualizer.init(this.audioCapture.analyser)
        break

      case 'smoke-mist':
        this.smokeMistVisualizer = new SmokeMistVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          maxParticles: density * 3
        })
        this.smokeMistVisualizer.init(this.audioCapture.analyser)
        break

      // Retro visualizers
      case 'vu-meters':
        this.vuMetersVisualizer = new VuMetersVisualizer({
          container: this.container,
          colorScheme: colorScheme
        })
        this.vuMetersVisualizer.init(this.audioCapture.analyser)
        break

      case 'led-matrix':
        this.ledMatrixVisualizer = new LedMatrixVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          cols: density
        })
        this.ledMatrixVisualizer.init(this.audioCapture.analyser)
        break

      case 'oscilloscope-crt':
        this.oscilloscopeCrtVisualizer = new OscilloscopeCrtVisualizer({
          container: this.container,
          colorScheme: colorScheme
        })
        this.oscilloscopeCrtVisualizer.init(this.audioCapture.analyser)
        break

      case 'neon-signs':
        this.neonSignsVisualizer = new NeonSignsVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          tubeCount: Math.max(3, Math.floor(density / 10))
        })
        this.neonSignsVisualizer.init(this.audioCapture.analyser)
        break

      case 'ascii-art':
        this.asciiArtVisualizer = new AsciiArtVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          cols: density
        })
        this.asciiArtVisualizer.init(this.audioCapture.analyser)
        break

      // Abstract visualizers
      case 'noise-field':
        this.noiseFieldVisualizer = new NoiseFieldVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          scale: Math.max(20, 100 - density)
        })
        this.noiseFieldVisualizer.init(this.audioCapture.analyser)
        break

      case 'color-field':
        this.colorFieldVisualizer = new ColorFieldVisualizer({
          container: this.container,
          colorScheme: colorScheme
        })
        this.colorFieldVisualizer.init(this.audioCapture.analyser)
        break

      case 'glitch':
        this.glitchVisualizer = new GlitchVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          intensity: density
        })
        this.glitchVisualizer.init(this.audioCapture.analyser)
        break

      case 'moire':
        this.moireVisualizer = new MoireVisualizer({
          container: this.container,
          colorScheme: colorScheme,
          lineCount: density
        })
        this.moireVisualizer.init(this.audioCapture.analyser)
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
    // Spectrum visualizers
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
    if (this.spectrumFlameVisualizer) {
      this.spectrumFlameVisualizer.destroy()
      this.spectrumFlameVisualizer = null
    }
    if (this.spectrumWaterfallVisualizer) {
      this.spectrumWaterfallVisualizer.destroy()
      this.spectrumWaterfallVisualizer = null
    }
    if (this.spectrumPeaksVisualizer) {
      this.spectrumPeaksVisualizer.destroy()
      this.spectrumPeaksVisualizer = null
    }
    if (this.spectrumStackVisualizer) {
      this.spectrumStackVisualizer.destroy()
      this.spectrumStackVisualizer = null
    }
    // Waveform visualizers
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
    if (this.waveformRibbonVisualizer) {
      this.waveformRibbonVisualizer.destroy()
      this.waveformRibbonVisualizer = null
    }
    if (this.waveformLissajousVisualizer) {
      this.waveformLissajousVisualizer.destroy()
      this.waveformLissajousVisualizer = null
    }
    if (this.waveformPhaseVisualizer) {
      this.waveformPhaseVisualizer.destroy()
      this.waveformPhaseVisualizer = null
    }
    // Effects visualizers
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
    // Geometric visualizers
    if (this.polygonMorphVisualizer) {
      this.polygonMorphVisualizer.destroy()
      this.polygonMorphVisualizer = null
    }
    if (this.spiralVisualizer) {
      this.spiralVisualizer.destroy()
      this.spiralVisualizer = null
    }
    if (this.hexagonGridVisualizer) {
      this.hexagonGridVisualizer.destroy()
      this.hexagonGridVisualizer = null
    }
    if (this.constellationVisualizer) {
      this.constellationVisualizer.destroy()
      this.constellationVisualizer = null
    }
    if (this.mandalaVisualizer) {
      this.mandalaVisualizer.destroy()
      this.mandalaVisualizer = null
    }
    // Physics visualizers
    if (this.bouncingBallsVisualizer) {
      this.bouncingBallsVisualizer.destroy()
      this.bouncingBallsVisualizer = null
    }
    if (this.pendulumWaveVisualizer) {
      this.pendulumWaveVisualizer.destroy()
      this.pendulumWaveVisualizer = null
    }
    if (this.stringVibrationVisualizer) {
      this.stringVibrationVisualizer.destroy()
      this.stringVibrationVisualizer = null
    }
    if (this.liquidVisualizer) {
      this.liquidVisualizer.destroy()
      this.liquidVisualizer = null
    }
    if (this.gravityWellsVisualizer) {
      this.gravityWellsVisualizer.destroy()
      this.gravityWellsVisualizer = null
    }
    // Organic visualizers
    if (this.breathingCircleVisualizer) {
      this.breathingCircleVisualizer.destroy()
      this.breathingCircleVisualizer = null
    }
    if (this.lightningVisualizer) {
      this.lightningVisualizer.destroy()
      this.lightningVisualizer = null
    }
    if (this.fireVisualizer) {
      this.fireVisualizer.destroy()
      this.fireVisualizer = null
    }
    if (this.smokeMistVisualizer) {
      this.smokeMistVisualizer.destroy()
      this.smokeMistVisualizer = null
    }
    // Retro visualizers
    if (this.vuMetersVisualizer) {
      this.vuMetersVisualizer.destroy()
      this.vuMetersVisualizer = null
    }
    if (this.ledMatrixVisualizer) {
      this.ledMatrixVisualizer.destroy()
      this.ledMatrixVisualizer = null
    }
    if (this.oscilloscopeCrtVisualizer) {
      this.oscilloscopeCrtVisualizer.destroy()
      this.oscilloscopeCrtVisualizer = null
    }
    if (this.neonSignsVisualizer) {
      this.neonSignsVisualizer.destroy()
      this.neonSignsVisualizer = null
    }
    if (this.asciiArtVisualizer) {
      this.asciiArtVisualizer.destroy()
      this.asciiArtVisualizer = null
    }
    // Abstract visualizers
    if (this.noiseFieldVisualizer) {
      this.noiseFieldVisualizer.destroy()
      this.noiseFieldVisualizer = null
    }
    if (this.colorFieldVisualizer) {
      this.colorFieldVisualizer.destroy()
      this.colorFieldVisualizer = null
    }
    if (this.glitchVisualizer) {
      this.glitchVisualizer.destroy()
      this.glitchVisualizer = null
    }
    if (this.moireVisualizer) {
      this.moireVisualizer.destroy()
      this.moireVisualizer = null
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
