import { Tray, Menu, nativeImage, app } from 'electron'
import { toggleVisibility, isWindowVisible, showSettingsWindow } from './window'

let tray: Tray | null = null

function createTrayIcon(): Electron.NativeImage {
  const size = 16
  const channels = 4 // RGBA
  const buffer = Buffer.alloc(size * size * channels, 0)

  // Helper to set a pixel
  const setPixel = (x: number, y: number, r: number, g: number, b: number, alpha: number = 255) => {
    const idx = (y * size + x) * channels
    buffer[idx] = r
    buffer[idx + 1] = g
    buffer[idx + 2] = b
    buffer[idx + 3] = alpha
  }

  // On Windows, use colored icon; on macOS use black template
  const isWindows = process.platform === 'win32'
  const color = isWindows ? { r: 0, g: 255, b: 128 } : { r: 0, g: 0, b: 0 }

  // Draw equalizer bars (5 bars of varying heights)
  const bars = [
    { x: 1, height: 6 },
    { x: 4, height: 10 },
    { x: 7, height: 8 },
    { x: 10, height: 12 },
    { x: 13, height: 9 },
  ]

  bars.forEach(bar => {
    const startY = size - bar.height - 1
    for (let y = startY; y < size - 1; y++) {
      setPixel(bar.x, y, color.r, color.g, color.b)
      setPixel(bar.x + 1, y, color.r, color.g, color.b)
    }
  })

  const icon = nativeImage.createFromBuffer(buffer, { width: size, height: size })

  // Mark as template image for macOS (adapts to light/dark mode)
  if (!isWindows) {
    icon.setTemplateImage(true)
  }

  return icon
}

export function createTray(): Tray {
  const icon = createTrayIcon()

  tray = new Tray(icon)
  tray.setToolTip('Audio Edge Effects')

  // On Windows, left-click should also show the menu
  if (process.platform === 'win32') {
    tray.on('click', () => {
      tray?.popUpContextMenu()
    })
  }

  updateTrayMenu()

  return tray
}

export function updateTrayMenu(): void {
  if (!tray) return

  const visible = isWindowVisible()

  const contextMenu = Menu.buildFromTemplate([
    {
      label: visible ? 'Hide Audio Edge Effects' : 'Show Audio Edge Effects',
      click: () => {
        toggleVisibility()
        updateTrayMenu()
      }
    },
    { type: 'separator' },
    {
      label: 'Settings...',
      click: () => showSettingsWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.exit(0)
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}
