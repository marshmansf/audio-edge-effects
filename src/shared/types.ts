export type EdgePosition = 'top' | 'bottom' | 'left' | 'right'

export type VisualizerMode =
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
  | 'breathing-circle' | 'tree-branches' | 'lightning' | 'fire' | 'smoke-mist'
  // Retro
  | 'vu-meters' | 'led-matrix' | 'oscilloscope-crt' | 'neon-signs' | 'ascii-art'
  // Abstract
  | 'noise-field' | 'color-field' | 'glitch' | 'moire'

export interface Settings {
  position: EdgePosition // Deprecated - kept for migration
  positions: EdgePosition[] // Active edges (supports multiple)
  height: number
  opacity: number
  visualizerMode: VisualizerMode
  audioDeviceId: string | null
  colorScheme: string
  density: number
  showPeaks: boolean
}

export const defaultSettings: Settings = {
  position: 'bottom',
  positions: ['bottom'],
  height: 60,
  opacity: 0.85,
  visualizerMode: 'spectrum',
  audioDeviceId: null,
  colorScheme: 'classic',
  density: 256,
  showPeaks: true
}

export interface AudioDevice {
  deviceId: string
  label: string
}

// IPC channel names
export const IPC = {
  GET_SETTINGS: 'get-settings',
  SET_SETTINGS: 'set-settings',
  GET_AUDIO_DEVICES: 'get-audio-devices',
  TOGGLE_VISUALIZER: 'toggle-visualizer',
  SET_POSITION: 'set-position',
  SET_OPACITY: 'set-opacity',
  SET_VISUALIZER_MODE: 'set-visualizer-mode'
} as const
