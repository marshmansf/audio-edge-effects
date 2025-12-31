# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audio Edge Effects is an Electron-based desktop application that displays audio visualizations as a transparent edge overlay on macOS (with Windows support). It captures system audio via BlackHole virtual audio driver and renders 46 different visualization modes across 8 categories.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Development mode (runs TypeScript watcher + Vite dev server + Electron)
npm run dev

# Build for production
npm run build

# Start app (production mode, after build)
npm run start

# Package for distribution
npm run dist          # Current platform
npm run dist:mac      # macOS (dmg, zip)
npm run dist:win      # Windows (nsis, portable)
```

## Architecture

### Main Process (`src/main/`)
- `index.ts` - Entry point, IPC handlers, app lifecycle, application menu, debug shortcuts
- `window.ts` - Transparent overlay window and settings window management
- `tray.ts` - System tray menu (Show/Hide, Settings, Quit)
- `store.ts` - Settings persistence via electron-store
- `preload.ts` - IPC bridge for renderer processes

### Renderer Process (`src/renderer/`)

**Main Visualizer Window:**
- `index.html` - Main visualizer page
- `index.ts` - App initialization, visualizer mode switching
- `audio/capture.ts` - Audio device enumeration, BlackHole capture via Web Audio API
- `visualizers/` - 46 visualization implementations across multiple files

**Settings Window:**
- `settings.html` - Settings UI page
- `settings.ts` - Settings UI logic and event handlers
- `settings.css` - Dark theme styling

### Shared (`src/shared/`)
- `types.ts` - TypeScript types, Settings interface, VisualizerMode union type

## Visualization Categories

46 visualizers organized in 8 categories:

1. **Spectrum** (8): spectrum, spectrum-cells, spectrum-bars, spectrum-circular, spectrum-flame, spectrum-waterfall, spectrum-peaks, spectrum-stack
2. **Waveform** (8): waveform, waveform-bars, waveform-glow, waveform-bands, waveform-filled, waveform-ribbon, waveform-lissajous, waveform-phase
3. **Effects** (6): spectrogram, energy-bars, beat-pulse, particles, plasma, terrain
4. **Geometric** (5): polygon-morph, spiral, hexagon-grid, constellation, mandala
5. **Physics** (5): bouncing-balls, pendulum-wave, string-vibration, liquid, gravity-wells
6. **Organic** (5): breathing-circle, tree-branches, lightning, fire, smoke-mist
7. **Retro** (5): vu-meters, led-matrix, oscilloscope-crt, neon-signs, ascii-art
8. **Abstract** (4): noise-field, color-field, glitch, moire

## Key Technical Patterns

### Audio Capture
The app uses `navigator.mediaDevices.getUserMedia()` to capture from BlackHole virtual audio device. The audio stream is connected to a Web Audio API `AnalyserNode` for FFT data.

### Transparent Overlay Window
```typescript
new BrowserWindow({
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  focusable: false
})
win.setIgnoreMouseEvents(true) // Click-through
```

### Settings Window
Separate BrowserWindow with standard chrome, opens via tray menu or Cmd+,. Changes apply immediately via IPC to the main visualizer window.

### Multi-Entry Vite Build
```typescript
// vite.config.ts
rollupOptions: {
  input: {
    main: resolve(__dirname, 'src/renderer/index.html'),
    settings: resolve(__dirname, 'src/renderer/settings.html')
  }
}
```

### Debug Keyboard Shortcuts
In development mode, Cmd+] cycles to next visualizer and Cmd+[ to previous. Registered via Electron's globalShortcut in main process.

## Settings

Stored via electron-store:
- `visualizerMode` - Current visualization mode
- `position` - Screen edge (top, bottom, left, right)
- `height` - Overlay size in pixels (40, 60, 80, 120)
- `density` - Element count for visualizations
- `opacity` - Window opacity (0.1 to 1.0)
- `colorScheme` - Color theme (classic, blue, purple, fire, ice, rainbow, light, dark)

## User Setup Requirement

Users must install BlackHole and configure a Multi-Output Device:
1. `brew install blackhole-2ch`
2. Audio MIDI Setup → Create Multi-Output Device
3. Add Built-in Output + BlackHole 2ch
4. Set Multi-Output Device as system output
