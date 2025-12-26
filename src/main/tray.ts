import { Tray, Menu, nativeImage, app } from 'electron'
import { toggleVisibility, setPosition, isWindowVisible, getWindow } from './window'
import { getSettings, setSetting } from './store'
import { EdgePosition, VisualizerMode } from '../shared/types'

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
  tray.setToolTip('Audio Visualizer')

  updateTrayMenu()

  return tray
}

export function updateTrayMenu(): void {
  if (!tray) return

  const settings = getSettings()
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
      label: 'Position',
      submenu: [
        {
          label: 'Top',
          type: 'radio',
          checked: settings.position === 'top',
          click: () => setPosition('top')
        },
        {
          label: 'Bottom',
          type: 'radio',
          checked: settings.position === 'bottom',
          click: () => setPosition('bottom')
        },
        {
          label: 'Left',
          type: 'radio',
          checked: settings.position === 'left',
          click: () => setPosition('left')
        },
        {
          label: 'Right',
          type: 'radio',
          checked: settings.position === 'right',
          click: () => setPosition('right')
        }
      ]
    },
    {
      label: 'Visualizer',
      submenu: [
        {
          label: 'Spectrum',
          type: 'radio',
          checked: settings.visualizerMode === 'spectrum',
          click: () => {
            setSetting('visualizerMode', 'spectrum')
            notifyRenderer('visualizer-mode-changed', 'spectrum')
          }
        },
        {
          label: 'Spectrum Cells',
          type: 'radio',
          checked: settings.visualizerMode === 'spectrum-cells',
          click: () => {
            setSetting('visualizerMode', 'spectrum-cells')
            notifyRenderer('visualizer-mode-changed', 'spectrum-cells')
          }
        },
        {
          label: 'Spectrum Bars',
          type: 'radio',
          checked: settings.visualizerMode === 'spectrum-bars',
          click: () => {
            setSetting('visualizerMode', 'spectrum-bars')
            notifyRenderer('visualizer-mode-changed', 'spectrum-bars')
          }
        },
        { type: 'separator' },
        {
          label: 'Waveform',
          type: 'radio',
          checked: settings.visualizerMode === 'waveform',
          click: () => {
            setSetting('visualizerMode', 'waveform')
            notifyRenderer('visualizer-mode-changed', 'waveform')
          }
        },
        {
          label: 'Waveform Bars',
          type: 'radio',
          checked: settings.visualizerMode === 'waveform-bars',
          click: () => {
            setSetting('visualizerMode', 'waveform-bars')
            notifyRenderer('visualizer-mode-changed', 'waveform-bars')
          }
        }
      ]
    },
    {
      label: 'Colors',
      submenu: [
        {
          label: 'Classic (Green)',
          type: 'radio',
          checked: settings.colorScheme === 'classic',
          click: () => setColorScheme('classic')
        },
        {
          label: 'Blue',
          type: 'radio',
          checked: settings.colorScheme === 'blue',
          click: () => setColorScheme('blue')
        },
        {
          label: 'Purple',
          type: 'radio',
          checked: settings.colorScheme === 'purple',
          click: () => setColorScheme('purple')
        },
        {
          label: 'Fire',
          type: 'radio',
          checked: settings.colorScheme === 'fire',
          click: () => setColorScheme('fire')
        },
        {
          label: 'Ice',
          type: 'radio',
          checked: settings.colorScheme === 'ice',
          click: () => setColorScheme('ice')
        },
        { type: 'separator' },
        {
          label: 'Light',
          type: 'radio',
          checked: settings.colorScheme === 'light',
          click: () => setColorScheme('light')
        },
        {
          label: 'Dark',
          type: 'radio',
          checked: settings.colorScheme === 'dark',
          click: () => setColorScheme('dark')
        },
        {
          label: 'Rainbow',
          type: 'radio',
          checked: settings.colorScheme === 'rainbow',
          click: () => setColorScheme('rainbow')
        }
      ]
    },
    {
      label: 'Size',
      submenu: [
        {
          label: 'Small (40px)',
          type: 'radio',
          checked: settings.height === 40,
          click: () => setHeightFromTray(40)
        },
        {
          label: 'Medium (60px)',
          type: 'radio',
          checked: settings.height === 60,
          click: () => setHeightFromTray(60)
        },
        {
          label: 'Large (80px)',
          type: 'radio',
          checked: settings.height === 80,
          click: () => setHeightFromTray(80)
        },
        {
          label: 'Extra Large (120px)',
          type: 'radio',
          checked: settings.height === 120,
          click: () => setHeightFromTray(120)
        }
      ]
    },
    {
      label: 'Opacity',
      submenu: [
        {
          label: '100%',
          type: 'radio',
          checked: settings.opacity === 1.0,
          click: () => setOpacity(1.0)
        },
        {
          label: '85%',
          type: 'radio',
          checked: settings.opacity === 0.85,
          click: () => setOpacity(0.85)
        },
        {
          label: '70%',
          type: 'radio',
          checked: settings.opacity === 0.7,
          click: () => setOpacity(0.7)
        },
        {
          label: '50%',
          type: 'radio',
          checked: settings.opacity === 0.5,
          click: () => setOpacity(0.5)
        },
        {
          label: '25%',
          type: 'radio',
          checked: settings.opacity === 0.25,
          click: () => setOpacity(0.25)
        },
        {
          label: '10%',
          type: 'radio',
          checked: settings.opacity === 0.1,
          click: () => setOpacity(0.1)
        }
      ]
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

function setHeightFromTray(height: number): void {
  const { setHeight } = require('./window')
  setHeight(height)
  updateTrayMenu()
}

function setOpacity(opacity: number): void {
  setSetting('opacity', opacity)
  notifyRenderer('opacity-changed', opacity)
  updateTrayMenu()
}

function setColorScheme(scheme: string): void {
  setSetting('colorScheme', scheme)
  notifyRenderer('color-scheme-changed', scheme)
  updateTrayMenu()
}

function notifyRenderer(channel: string, data: unknown): void {
  const win = getWindow()
  if (win) {
    win.webContents.send(channel, data)
  }
}
