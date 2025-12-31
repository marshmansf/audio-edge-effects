import { app, ipcMain, session, globalShortcut } from 'electron'
import { createWindow, getWindow } from './window'
import { createTray, updateTrayMenu } from './tray'
import { getSettings, setSetting } from './store'
import { VisualizerMode } from '../shared/types'

// All visualizer modes in order for debug navigation
const ALL_VISUALIZER_MODES: VisualizerMode[] = [
  // Spectrum
  'spectrum', 'spectrum-cells', 'spectrum-bars', 'spectrum-circular',
  'spectrum-flame', 'spectrum-waterfall', 'spectrum-peaks', 'spectrum-stack',
  // Waveform
  'waveform', 'waveform-bars', 'waveform-glow', 'waveform-bands', 'waveform-filled',
  'waveform-ribbon', 'waveform-lissajous', 'waveform-phase',
  // Effects
  'spectrogram', 'energy-bars', 'beat-pulse', 'particles', 'plasma', 'terrain',
  // Geometric
  'polygon-morph', 'spiral', 'hexagon-grid', 'constellation', 'mandala',
  // Physics
  'bouncing-balls', 'pendulum-wave', 'string-vibration', 'liquid', 'gravity-wells',
  // Organic
  'breathing-circle', 'tree-branches', 'lightning', 'fire', 'smoke-mist',
  // Retro
  'vu-meters', 'led-matrix', 'oscilloscope-crt', 'neon-signs', 'ascii-art',
  // Abstract
  'noise-field', 'color-field', 'glitch', 'moire'
]

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.whenReady().then(() => {
  // Request microphone permission for audio capture
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true)
    } else {
      callback(false)
    }
  })

  createWindow()
  createTray()

  // Register debug shortcuts if enabled
  registerDebugShortcuts()
})

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll()
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  const { getWindow } = require('./window')
  if (!getWindow()) {
    createWindow()
  }
})

// IPC handlers
ipcMain.handle('get-settings', () => {
  return getSettings()
})

ipcMain.handle('set-setting', (_event, key: string, value: unknown) => {
  setSetting(key as keyof ReturnType<typeof getSettings>, value as never)

  // Notify the main visualizer window of the change
  const win = getWindow()
  if (win) {
    switch (key) {
      case 'visualizerMode':
        win.webContents.send('visualizer-mode-changed', value)
        break
      case 'opacity':
        win.webContents.send('opacity-changed', value)
        break
      case 'position':
        // Also update window position
        const { setPosition } = require('./window')
        setPosition(value as string)
        break
      case 'height':
        // Also update window size
        const { setHeight } = require('./window')
        setHeight(value as number)
        break
      case 'colorScheme':
        win.webContents.send('color-scheme-changed', value)
        break
      case 'density':
        win.webContents.send('density-changed', value)
        break
    }
  }

  return true
})

ipcMain.handle('is-dev-mode', () => {
  return process.env.NODE_ENV === 'development'
})

// Debug keyboard shortcuts (global shortcuts)
function navigateVisualizer(direction: 'next' | 'prev'): void {
  const settings = getSettings()
  const currentIndex = ALL_VISUALIZER_MODES.indexOf(settings.visualizerMode)
  let newIndex: number

  if (direction === 'next') {
    newIndex = (currentIndex + 1) % ALL_VISUALIZER_MODES.length
  } else {
    newIndex = (currentIndex - 1 + ALL_VISUALIZER_MODES.length) % ALL_VISUALIZER_MODES.length
  }

  const newMode = ALL_VISUALIZER_MODES[newIndex]
  console.log(`Switching to: ${newMode} (${newIndex + 1}/${ALL_VISUALIZER_MODES.length})`)

  setSetting('visualizerMode', newMode)

  const win = getWindow()
  if (win) {
    win.webContents.send('visualizer-mode-changed', newMode)
  }

  updateTrayMenu()
}

export function registerDebugShortcuts(): void {
  // Only register in dev mode
  if (process.env.NODE_ENV !== 'development') return

  const settings = getSettings()
  if (!settings.debugKeyboardShortcuts) return

  // Use Ctrl+] for next and Ctrl+[ for previous
  globalShortcut.register('CommandOrControl+]', () => {
    navigateVisualizer('next')
  })

  globalShortcut.register('CommandOrControl+[', () => {
    navigateVisualizer('prev')
  })

  console.log('Debug keyboard shortcuts registered: Ctrl+[ for previous, Ctrl+] for next')
}

export function unregisterDebugShortcuts(): void {
  globalShortcut.unregister('CommandOrControl+]')
  globalShortcut.unregister('CommandOrControl+[')
  console.log('Debug keyboard shortcuts unregistered')
}

export function updateDebugShortcuts(): void {
  unregisterDebugShortcuts()
  registerDebugShortcuts()
}
