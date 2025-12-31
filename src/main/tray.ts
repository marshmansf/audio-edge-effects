import { Tray, Menu, nativeImage, app } from 'electron'
import { toggleVisibility, isWindowVisible, showSettingsWindow } from './window'

let tray: Tray | null = null

export function createTray(): Tray {
  // Create a 16x16 template icon for macOS menu bar
  // Using raw RGBA pixel data to create an equalizer bars icon
  const size = 16
  const channels = 4 // RGBA

  // Create pixel buffer (16x16 RGBA)
  const buffer = Buffer.alloc(size * size * channels, 0)

  // Helper to set a pixel (template icons should be black with alpha)
  const setPixel = (x: number, y: number, alpha: number = 255) => {
    const idx = (y * size + x) * channels
    buffer[idx] = 0       // R - black
    buffer[idx + 1] = 0   // G - black
    buffer[idx + 2] = 0   // B - black
    buffer[idx + 3] = alpha // A
  }

  // Draw equalizer bars (5 bars of varying heights)
  const bars = [
    { x: 1, height: 6 },   // Bar 1
    { x: 4, height: 10 },  // Bar 2
    { x: 7, height: 8 },   // Bar 3
    { x: 10, height: 12 }, // Bar 4
    { x: 13, height: 9 },  // Bar 5
  ]

  bars.forEach(bar => {
    const startY = size - bar.height - 1
    for (let y = startY; y < size - 1; y++) {
      setPixel(bar.x, y)
      setPixel(bar.x + 1, y)
    }
  })

  const icon = nativeImage.createFromBuffer(buffer, {
    width: size,
    height: size
  })

  // Mark as template image for macOS (adapts to light/dark mode)
  icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('Audio Edge Effects')

  updateTrayMenu()

  return tray
}

export function updateTrayMenu(): void {
  if (!tray) return

  const visible = isWindowVisible()

  const contextMenu = Menu.buildFromTemplate([
    {
      label: visible ? 'Hide Visualizer' : 'Show Visualizer',
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
