import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('set-setting', key, value),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),

  // Toggle a position on/off (for multi-edge support)
  togglePosition: (position: string) => ipcRenderer.invoke('toggle-position', position),

  // Get this window's position from URL query parameter
  getWindowPosition: () => {
    const params = new URLSearchParams(window.location.search)
    return params.get('position') || 'bottom'
  },

  onVisualizerModeChanged: (callback: (mode: string) => void) => {
    ipcRenderer.on('visualizer-mode-changed', (_event, mode) => callback(mode))
  },

  onOpacityChanged: (callback: (opacity: number) => void) => {
    ipcRenderer.on('opacity-changed', (_event, opacity) => callback(opacity))
  },

  onColorSchemeChanged: (callback: (scheme: string) => void) => {
    ipcRenderer.on('color-scheme-changed', (_event, scheme) => callback(scheme))
  },

  onDensityChanged: (callback: (density: number) => void) => {
    ipcRenderer.on('density-changed', (_event, density) => callback(density))
  }
})
