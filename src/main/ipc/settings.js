import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getSettings, setSettings } from '../settings-store.js'
import { restartWhisperService } from '../whisper-service.js'

export function registerSettingsIpc() {
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (e, partial) => {
    const before = getSettings().computeMode
    const next = setSettings(partial || {})
    // Recharge le serveur whisper.cpp si le mode de calcul change réellement
    // (pertinent pour un build GPU/CPU distinct ; sans effet sur un build CPU seul).
    if (partial && 'computeMode' in partial && partial.computeMode !== before) {
      restartWhisperService((ch, p) => { for (const w of BrowserWindow.getAllWindows()) w.webContents.send(ch, p) })
    }
    return next
  })
  ipcMain.handle('settings:browse-folder', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const res = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] })
    if (res.canceled || !res.filePaths.length) return null
    return res.filePaths[0]
  })

  // Crédit OpenRouter restant (null si pas de clé).
  ipcMain.handle('openrouter:credits', async () => {
    const { openrouterKey } = getSettings()
    if (!openrouterKey) return null
    try {
      const r = await fetch('https://openrouter.ai/api/v1/credits', {
        headers: { Authorization: `Bearer ${openrouterKey}` },
      })
      if (!r.ok) return { error: `HTTP ${r.status}` }
      const j = await r.json()
      const total = j?.data?.total_credits
      const usage = j?.data?.total_usage
      if (typeof total === 'number' && typeof usage === 'number') {
        return { remaining: Math.max(0, total - usage), total, usage }
      }
      return { error: 'format inattendu' }
    } catch (e) {
      return { error: String(e.message || e) }
    }
  })
}
