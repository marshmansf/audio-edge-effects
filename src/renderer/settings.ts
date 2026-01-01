// Type definitions for Electron API exposed via preload
declare global {
  interface Window {
    electronAPI: {
      getSettings: () => Promise<Settings>
      setSetting: (key: string, value: unknown) => Promise<boolean>
    }
  }
}

interface Settings {
  position: string
  height: number
  opacity: number
  visualizerMode: string
  audioDeviceId: string | null
  colorScheme: string
  density: number
  showPeaks: boolean
}

class SettingsUI {
  private visualizerSelect: HTMLSelectElement
  private positionZones: NodeListOf<HTMLElement>
  private sizeButtons: NodeListOf<HTMLButtonElement>
  private densitySlider: HTMLInputElement
  private densityValue: HTMLSpanElement
  private opacitySlider: HTMLInputElement
  private opacityValue: HTMLSpanElement
  private colorRadios: NodeListOf<HTMLInputElement>

  constructor() {
    this.visualizerSelect = document.getElementById('visualizer') as HTMLSelectElement
    this.positionZones = document.querySelectorAll('.screen-zone[data-position]') as NodeListOf<HTMLElement>
    this.sizeButtons = document.querySelectorAll('[data-size]') as NodeListOf<HTMLButtonElement>
    this.densitySlider = document.getElementById('density') as HTMLInputElement
    this.densityValue = document.getElementById('density-value') as HTMLSpanElement
    this.opacitySlider = document.getElementById('opacity') as HTMLInputElement
    this.opacityValue = document.getElementById('opacity-value') as HTMLSpanElement
    this.colorRadios = document.querySelectorAll('input[name="colorScheme"]') as NodeListOf<HTMLInputElement>

    this.init()
  }

  private async init(): Promise<void> {
    // Load current settings
    const settings = await window.electronAPI.getSettings()
    this.applySettings(settings)

    // Set up event listeners
    this.setupEventListeners()
  }

  private applySettings(settings: Settings): void {
    // Visualizer
    this.visualizerSelect.value = settings.visualizerMode

    // Position
    this.positionZones.forEach(zone => {
      zone.classList.toggle('active', zone.dataset.position === settings.position)
    })

    // Size
    this.sizeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === String(settings.height))
    })

    // Density
    this.densitySlider.value = String(settings.density)
    this.densityValue.textContent = String(settings.density)

    // Opacity
    const opacityPercent = Math.round(settings.opacity * 100)
    this.opacitySlider.value = String(opacityPercent)
    this.opacityValue.textContent = `${opacityPercent}%`

    // Color scheme
    this.colorRadios.forEach(radio => {
      radio.checked = radio.value === settings.colorScheme
    })
  }

  private setupEventListeners(): void {
    // Visualizer change
    this.visualizerSelect.addEventListener('change', () => {
      this.saveSetting('visualizerMode', this.visualizerSelect.value)
    })

    // Position zones
    this.positionZones.forEach(zone => {
      zone.addEventListener('click', () => {
        this.positionZones.forEach(z => z.classList.remove('active'))
        zone.classList.add('active')
        this.saveSetting('position', zone.dataset.position!)
      })
    })

    // Size buttons
    this.sizeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.sizeButtons.forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        this.saveSetting('height', Number(btn.dataset.size!))
      })
    })

    // Density slider
    this.densitySlider.addEventListener('input', () => {
      const value = Number(this.densitySlider.value)
      this.densityValue.textContent = String(value)
    })
    this.densitySlider.addEventListener('change', () => {
      this.saveSetting('density', Number(this.densitySlider.value))
    })

    // Opacity slider
    this.opacitySlider.addEventListener('input', () => {
      const value = Number(this.opacitySlider.value)
      this.opacityValue.textContent = `${value}%`
    })
    this.opacitySlider.addEventListener('change', () => {
      this.saveSetting('opacity', Number(this.opacitySlider.value) / 100)
    })

    // Color scheme radios
    this.colorRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.saveSetting('colorScheme', radio.value)
        }
      })
    })
  }

  private async saveSetting(key: string, value: unknown): Promise<void> {
    await window.electronAPI.setSetting(key, value)
  }
}

// Initialize
new SettingsUI()
