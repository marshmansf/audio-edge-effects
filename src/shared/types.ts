export type EdgePosition = 'top' | 'bottom' | 'left' | 'right'

export type VisualizerMode =
  | 'spectrum' | 'spectrum-cells' | 'spectrum-bars' | 'spectrum-circular'
  | 'waveform' | 'waveform-bars' | 'waveform-glow' | 'waveform-bands' | 'waveform-filled'
  | 'spectrogram' | 'energy-bars' | 'beat-pulse' | 'particles' | 'plasma' | 'terrain'

export interface Settings {
  position: EdgePosition
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
