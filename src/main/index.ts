import { app, ipcMain, session, globalShortcut, screen, desktopCapturer } from 'electron'
import { createWindows, broadcastToOverlays, syncOverlayWindows, setHeight, getFirstOverlayWindow } from './window'
import { createTray, updateTrayMenu } from './tray'
import { getSettings, setSetting, togglePosition } from './store'
import { VisualizerMode, EdgePosition } from '../shared/types'
import * as os from 'os'

// Enable ScreenCaptureKit for system audio loopback on macOS 13.2+
if (process.platform === 'darwin') {
  const macVersion = os.release().split('.').map(Number)
  // Darwin 22.4+ corresponds to macOS 13.2+
  if (macVersion[0] >= 22 && (macVersion[0] > 22 || macVersion[1] >= 4)) {
    app.commandLine.appendSwitch('enable-features', 'MacLoopbackAudioForScreenShare,MacSckSystemAudioLoopbackOverride')
  }
}

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
  'breathing-circle', 'lightning', 'fire', 'smoke-mist',
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
  // Set up display media request handler for system audio loopback via ScreenCaptureKit
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    // Get desktop sources - we need to provide a video source even for audio-only capture
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    if (sources.length === 0) {
      callback({})
      return
    }
    // Return the first screen source with loopback audio
    callback({ video: sources[0], audio: 'loopback' })
  })

  // Request media permission for audio capture
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true)
    } else {
      callback(false)
    }
  })

  createWindows()
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
  if (!getFirstOverlayWindow()) {
    createWindows()
  }
})

// IPC handlers
ipcMain.handle('get-settings', () => {
  return getSettings()
})

ipcMain.handle('get-screen-size', () => {
  const primaryDisplay = screen.getPrimaryDisplay()
  return primaryDisplay.size
})

ipcMain.handle('set-setting', (_event, key: string, value: unknown) => {
  setSetting(key as keyof ReturnType<typeof getSettings>, value as never)

  // Broadcast changes to all overlay windows
  switch (key) {
    case 'visualizerMode':
      broadcastToOverlays('visualizer-mode-changed', value)
      break
    case 'opacity':
      broadcastToOverlays('opacity-changed', value)
      break
    case 'height':
      setHeight(value as number)
      break
    case 'colorScheme':
      broadcastToOverlays('color-scheme-changed', value)
      break
    case 'density':
      broadcastToOverlays('density-changed', value)
      break
  }

  return true
})

ipcMain.handle('toggle-position', (_event, position: EdgePosition) => {
  const newPositions = togglePosition(position)
  syncOverlayWindows(newPositions)
  return newPositions
})

// Debug keyboard shortcuts (global shortcuts, dev mode only)
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
  broadcastToOverlays('visualizer-mode-changed', newMode)

  updateTrayMenu()
}

function registerDebugShortcuts(): void {
  // Only register in dev mode
  if (process.env.NODE_ENV !== 'development') return

  // Use Ctrl+] for next and Ctrl+[ for previous
  globalShortcut.register('CommandOrControl+]', () => {
    navigateVisualizer('next')
  })

  globalShortcut.register('CommandOrControl+[', () => {
    navigateVisualizer('prev')
  })

  console.log('Debug keyboard shortcuts registered: Cmd+[ for previous, Cmd+] for next')
}
