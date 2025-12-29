# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audio Edge Effects is an Electron-based desktop application that displays audio visualizations as a transparent edge overlay on macOS (with Windows support). It captures system audio via BlackHole virtual audio driver and renders WinAmp-inspired spectrum and waveform visualizations.

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
- `index.ts` - Entry point, IPC handlers, app lifecycle
- `window.ts` - Transparent overlay window management, positioning
- `tray.ts` - System tray menu for controls (since window is click-through)
- `store.ts` - Settings persistence via electron-store
- `preload.ts` - IPC bridge for renderer

### Renderer Process (`src/renderer/`)
- `index.ts` - App initialization, mode switching
- `audio/capture.ts` - Audio device enumeration, BlackHole capture via Web Audio API
- `visualizers/spectrum.ts` - Spectrum analyzer using audioMotion-analyzer
- `visualizers/waveform.ts` - Oscilloscope-style waveform via Canvas

### Shared (`src/shared/`)
- `types.ts` - TypeScript types, settings interface, IPC channel constants

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

### Visualization
- **Spectrum**: Uses `audiomotion-analyzer` library with mode 6 (1/6th octave bands) for high-resolution bars
- **Waveform**: Custom Canvas 2D rendering with glow effects

## User Setup Requirement

Users must install BlackHole and configure a Multi-Output Device:
1. `brew install blackhole-2ch`
2. Audio MIDI Setup → Create Multi-Output Device
3. Add Built-in Output + BlackHole 2ch
4. Set Multi-Output Device as system output
