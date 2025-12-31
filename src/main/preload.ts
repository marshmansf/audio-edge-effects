import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('set-setting', key, value),

  onVisualizerModeChanged: (callback: (mode: string) => void) => {
    ipcRenderer.on('visualizer-mode-changed', (_event, mode) => callback(mode))
  },

  onOpacityChanged: (callback: (opacity: number) => void) => {
    ipcRenderer.on('opacity-changed', (_event, opacity) => callback(opacity))
  },

  onPositionChanged: (callback: (position: string) => void) => {
    ipcRenderer.on('position-changed', (_event, position) => callback(position))
  },

  onColorSchemeChanged: (callback: (scheme: string) => void) => {
    ipcRenderer.on('color-scheme-changed', (_event, scheme) => callback(scheme))
  },

  onDensityChanged: (callback: (density: number) => void) => {
    ipcRenderer.on('density-changed', (_event, density) => callback(density))
  }
})
