# Audio Visualizer

A WinAmp-inspired audio visualizer that displays as a transparent edge overlay on your desktop. Captures system audio and renders real-time spectrum and waveform visualizations.

![macOS](https://img.shields.io/badge/macOS-supported-brightgreen)
![Windows](https://img.shields.io/badge/Windows-supported-brightgreen)

## Features

- **Transparent Edge Overlay** - Sits on any screen edge (top, bottom, left, right) without interfering with your work
- **Click-through** - Mouse events pass through to applications below
- **Multiple Visualizations**
  - Spectrum analyzer with ~240 frequency bars
  - Waveform oscilloscope
- **Color Schemes** - Classic green, Blue, Purple, Fire, Ice, Light, Dark, Rainbow
- **Customizable** - Adjust position, size, and opacity via system tray menu
- **System Audio Capture** - Visualizes any audio playing on your computer (Spotify, YouTube, etc.)

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
git clone https://github.com/yourusername/audio-visualizer.git
cd audio-visualizer

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

All controls are accessible via the **system tray icon** (menu bar on macOS):

- **Show/Hide Visualizer** - Toggle visibility
- **Position** - Top, Bottom, Left, Right
- **Visualizer** - Spectrum or Waveform
- **Colors** - 8 color schemes
- **Size** - Small (40px) to Extra Large (120px)
- **Opacity** - 10% to 100%
- **Quit** - Exit the application

## Tech Stack

- **Electron** - Cross-platform desktop app
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Web Audio API** - Audio capture and analysis
- **audioMotion-analyzer** - High-resolution spectrum visualization
- **electron-store** - Settings persistence
- **electron-builder** - App packaging

## Project Structure

```
audio-visualizer/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Entry point, IPC handlers
│   │   ├── window.ts   # Window management
│   │   ├── tray.ts     # System tray menu
│   │   ├── store.ts    # Settings persistence
│   │   └── preload.ts  # IPC bridge
│   ├── renderer/       # Frontend
│   │   ├── index.ts    # App initialization
│   │   ├── audio/      # Audio capture
│   │   ├── visualizers/# Spectrum & waveform
│   │   └── styles/     # CSS
│   └── shared/         # Shared types
├── CLAUDE.md           # AI assistant context
└── README.md
```

## License

MIT
