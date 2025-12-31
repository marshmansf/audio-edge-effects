# Audio Edge Effects

A real-time audio visualizer that displays as a transparent edge overlay on your desktop. Captures system audio and renders a variety of spectrum, waveform, and artistic visualizations.

![macOS](https://img.shields.io/badge/macOS-supported-brightgreen)
![Windows](https://img.shields.io/badge/Windows-supported-brightgreen)

## Features

- **Transparent Edge Overlay** - Sits on any screen edge (top, bottom, left, right) without interfering with your work
- **Click-through** - Mouse events pass through to applications below
- **46 Visualization Modes** across 8 categories:
  - **Spectrum** - Classic bars, cells, circular, flame, waterfall, peaks, stack
  - **Waveform** - Oscilloscope, bars, glow, bands, filled, ribbon, lissajous, phase
  - **Effects** - Spectrogram, energy bars, beat pulse, particles, plasma, terrain
  - **Geometric** - Polygon morph, spiral, hexagon grid, constellation, mandala
  - **Physics** - Bouncing balls, pendulum wave, string vibration, liquid, gravity wells
  - **Organic** - Breathing circle, tree branches, lightning, fire, smoke/mist
  - **Retro** - VU meters, LED matrix, CRT oscilloscope, neon signs, ASCII art
  - **Abstract** - Noise field, color field, glitch, moire
- **8 Color Schemes** - Classic green, Blue, Purple, Fire, Ice, Light, Dark, Rainbow
- **Settings Window** - Configure all options via a dedicated settings UI
- **Customizable** - Adjust position, size, density, and opacity
- **System Audio Capture** - Visualizes any audio playing on your computer

## Prerequisites

### macOS

This app requires [BlackHole](https://github.com/ExistentialAudio/BlackHole) to capture system audio:

```bash
brew install blackhole-2ch
```

Then configure audio routing:

1. Open **Audio MIDI Setup** (Spotlight → "Audio MIDI Setup")
2. Click **+** → **Create Multi-Output Device**
3. Check both **Built-in Output** (or your headphones) and **BlackHole 2ch**
4. Right-click the Multi-Output Device → **Use This Device For Sound Output**

### Windows

On Windows, the app can capture system audio directly via WASAPI loopback (no additional setup required).

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/audio-edge-effects.git
cd audio-edge-effects

# Install dependencies
npm install
```

## Usage

### Development

```bash
npm run dev
```

This starts the app in development mode with hot reload.

### Production

```bash
# Build the app
npm run build

# Run the built app
npm run start
```

### Package for Distribution

```bash
# Package for current platform
npm run dist

# Package for macOS
npm run dist:mac

# Package for Windows
npm run dist:win
```

## Controls

Access settings via:
- **System tray icon** (menu bar on macOS) → **Settings...**
- **App menu** → **Settings...** (Cmd+, on macOS)

Settings window options:
- **Visualizer** - Choose from 46 visualization modes
- **Position** - Top, Bottom, Left, Right
- **Size** - Small (40px), Medium (60px), Large (80px), Extra Large (120px)
- **Density** - Control the number of elements in visualizations
- **Opacity** - 10% to 100%
- **Color Scheme** - 8 color themes

The system tray also provides quick access to show/hide the visualizer.

## Tech Stack

- **Electron** - Cross-platform desktop app
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool with multi-entry support
- **Web Audio API** - Audio capture and analysis
- **audioMotion-analyzer** - Spectrum visualization foundation
- **Canvas 2D** - Custom visualizations
- **electron-store** - Settings persistence
- **electron-builder** - App packaging

## Project Structure

```
audio-edge-effects/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Entry point, IPC handlers, app menu
│   │   ├── window.ts      # Window management (overlay + settings)
│   │   ├── tray.ts        # System tray menu
│   │   ├── store.ts       # Settings persistence
│   │   └── preload.ts     # IPC bridge
│   ├── renderer/          # Frontend
│   │   ├── index.html     # Main visualizer page
│   │   ├── index.ts       # Visualizer initialization
│   │   ├── settings.html  # Settings window page
│   │   ├── settings.ts    # Settings UI logic
│   │   ├── settings.css   # Settings styling
│   │   ├── audio/         # Audio capture
│   │   ├── visualizers/   # 46 visualization modes
│   │   └── styles/        # CSS
│   └── shared/            # Shared types
├── CLAUDE.md              # AI assistant context
└── README.md
```

## License

MIT
