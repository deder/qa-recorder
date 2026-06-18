import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getSettings, setSettings } from '../settings-store.js'

export function registerSettingsIpc() {
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (e, partial) => setSettings(partial || {}))
  ipcMain.handle('settings:browse-folder', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const res = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] })
    if (res.canceled || !res.filePaths.length) return null
    return res.filePaths[0]
  })
}
