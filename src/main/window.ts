import { BrowserWindow, screen } from 'electron'
import * as path from 'path'
import { getSettings, setSetting } from './store'
import { EdgePosition } from '../shared/types'

// Map of overlay windows keyed by position
const overlayWindows: Map<EdgePosition, BrowserWindow> = new Map()
let settingsWindow: BrowserWindow | null = null
let isVisible = true

function createOverlayWindow(position: EdgePosition): BrowserWindow {
  const settings = getSettings()
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.size

  const windowConfig = getWindowConfig(position, screenWidth, screenHeight, settings.height)

  const win = new BrowserWindow({
    ...windowConfig,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Make window click-through
  win.setIgnoreMouseEvents(true)

  // Prevent window from being closed, just hide it
  win.on('close', (e) => {
    e.preventDefault()
    win.hide()
  })

  win.on('closed', () => {
    overlayWindows.delete(position)
  })

  // Load the renderer with position query parameter
  if (process.env.NODE_ENV === 'development') {
    win.loadURL(`http://localhost:5173?position=${position}`)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), {
      query: { position }
    })
  }

  return win
}

export function createWindows(): void {
  const settings = getSettings()
  const positions = settings.positions || ['bottom']

  for (const position of positions) {
    if (!overlayWindows.has(position)) {
      const win = createOverlayWindow(position)
      overlayWindows.set(position, win)
    }
  }
}

export function syncOverlayWindows(positions: EdgePosition[]): void {
  // Remove windows for positions no longer active
  for (const [pos, win] of overlayWindows) {
    if (!positions.includes(pos)) {
      win.destroy()
      overlayWindows.delete(pos)
    }
  }

  // Add windows for new positions
  for (const pos of positions) {
    if (!overlayWindows.has(pos)) {
      const win = createOverlayWindow(pos)
      overlayWindows.set(pos, win)
      if (isVisible) win.show()
    }
  }
}

export function broadcastToOverlays(channel: string, ...args: unknown[]): void {
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args)
    }
  }
}

function getWindowConfig(position: EdgePosition, screenWidth: number, screenHeight: number, height: number) {
  switch (position) {
    case 'top':
      return { x: 0, y: 0, width: screenWidth, height }
    case 'bottom':
      return { x: 0, y: screenHeight - height, width: screenWidth, height }
    case 'left':
      return { x: 0, y: 0, width: height, height: screenHeight }
    case 'right':
      return { x: screenWidth - height, y: 0, width: height, height: screenHeight }
    default:
      return { x: 0, y: screenHeight - height, width: screenWidth, height }
  }
}

export function setHeight(height: number): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.size

  for (const [position, win] of overlayWindows) {
    const config = getWindowConfig(position, screenWidth, screenHeight, height)
    win.setBounds(config)
  }
  setSetting('height', height)
}

export function toggleVisibility(): boolean {
  isVisible = !isVisible

  for (const win of overlayWindows.values()) {
    if (isVisible) {
      win.show()
    } else {
      win.hide()
    }
  }

  return isVisible
}

export function getOverlayWindows(): Map<EdgePosition, BrowserWindow> {
  return overlayWindows
}

export function getFirstOverlayWindow(): BrowserWindow | null {
  const first = overlayWindows.values().next()
  return first.done ? null : first.value
}

export function isWindowVisible(): boolean {
  return isVisible
}

// Settings Window
export function showSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 420,
    height: 580,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'Audio Edge Effects Settings',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  // Load the settings page
  if (process.env.NODE_ENV === 'development') {
    settingsWindow.loadURL('http://localhost:5173/settings.html')
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'))
  }
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}
