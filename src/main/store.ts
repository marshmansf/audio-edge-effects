import Store from 'electron-store'
import { Settings, defaultSettings, EdgePosition } from '../shared/types'

const store = new Store<Settings>({
  defaults: defaultSettings
})

export function getSettings(): Settings {
  // Migration: if positions doesn't exist, create it from single position
  let positions = store.get('positions')
  if (!positions || !Array.isArray(positions) || positions.length === 0) {
    const position = store.get('position') as EdgePosition
    positions = position ? [position] : ['bottom']
    store.set('positions', positions)
  }

  return {
    position: store.get('position'),
    positions: positions,
    height: store.get('height'),
    opacity: store.get('opacity'),
    visualizerMode: store.get('visualizerMode'),
    audioDeviceId: store.get('audioDeviceId'),
    colorScheme: store.get('colorScheme'),
    density: store.get('density'),
    showPeaks: store.get('showPeaks')
  }
}

export function togglePosition(position: EdgePosition): EdgePosition[] {
  const current = (store.get('positions') as EdgePosition[]) || ['bottom']
  const index = current.indexOf(position)

  if (index >= 0) {
    // Remove position (but don't allow empty array)
    if (current.length > 1) {
      const updated = current.filter(p => p !== position)
      store.set('positions', updated)
      return updated
    }
    return current // Can't remove last position
  } else {
    // Add position
    const updated = [...current, position]
    store.set('positions', updated)
    return updated
  }
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  store.set(key, value)
}

export function setSettings(settings: Partial<Settings>): void {
  for (const [key, value] of Object.entries(settings)) {
    store.set(key as keyof Settings, value)
  }
}
