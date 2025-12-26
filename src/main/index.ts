import { app, ipcMain, session } from 'electron'
import { createWindow } from './window'
import { createTray } from './tray'
import { getSettings, setSetting } from './store'

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.whenReady().then(() => {
  // Request microphone permission for audio capture
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true)
    } else {
      callback(false)
    }
  })

  createWindow()
  createTray()
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  const { getWindow } = require('./window')
  if (!getWindow()) {
    createWindow()
  }
})

// IPC handlers
ipcMain.handle('get-settings', () => {
  return getSettings()
})

ipcMain.handle('set-setting', (_event, key: string, value: unknown) => {
  setSetting(key as keyof ReturnType<typeof getSettings>, value as never)
  return true
})
