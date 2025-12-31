import { BrowserWindow, screen } from 'electron'
import * as path from 'path'
import { getSettings, setSetting } from './store'
import { EdgePosition } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let isVisible = true

export function createWindow(): BrowserWindow {
  const settings = getSettings()
  const primaryDisplay = screen.getPrimaryDisplay()
  // Use full screen size (not workAreaSize) to align with actual screen edges
  const { width: screenWidth, height: screenHeight } = primaryDisplay.size

  const windowConfig = getWindowConfig(settings.position, screenWidth, screenHeight, settings.height)

  mainWindow = new BrowserWindow({
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
  mainWindow.setIgnoreMouseEvents(true)

  // Prevent window from being closed, just hide it
  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow?.hide()
    isVisible = false
  })

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
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

export function setPosition(position: EdgePosition): void {
  if (!mainWindow) return

  const settings = getSettings()
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.size

  const config = getWindowConfig(position, screenWidth, screenHeight, settings.height)
  mainWindow.setBounds(config)
  setSetting('position', position)

  // Notify renderer of position change for rotation
  mainWindow.webContents.send('position-changed', position)
}

export function setHeight(height: number): void {
  if (!mainWindow) return

  const settings = getSettings()
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.size

  const config = getWindowConfig(settings.position, screenWidth, screenHeight, height)
  mainWindow.setBounds(config)
  setSetting('height', height)
}

export function toggleVisibility(): boolean {
  if (!mainWindow) return false

  if (isVisible) {
    mainWindow.hide()
    isVisible = false
  } else {
    mainWindow.show()
    isVisible = true
  }

  return isVisible
}

export function getWindow(): BrowserWindow | null {
  return mainWindow
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
    height: 480,
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
