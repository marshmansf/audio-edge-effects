import Store from 'electron-store'
import { Settings, defaultSettings } from '../shared/types'

const store = new Store<Settings>({
  defaults: defaultSettings
})

export function getSettings(): Settings {
  return {
    position: store.get('position'),
    height: store.get('height'),
    opacity: store.get('opacity'),
    visualizerMode: store.get('visualizerMode'),
    audioDeviceId: store.get('audioDeviceId'),
    colorScheme: store.get('colorScheme'),
    density: store.get('density'),
    showPeaks: store.get('showPeaks')
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
