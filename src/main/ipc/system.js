import { ipcMain, desktopCapturer, app, screen, shell } from 'electron'
import fs from 'node:fs'
import { join } from 'node:path'
import { getSettings } from '../settings-store.js'
import { getWhisperStatus } from '../whisper-service.js'

// Taille récursive d'un dossier (octets).
function dirSize(dir) {
  let total = 0
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return 0 }
  for (const e of entries) {
    const p = join(dir, e.name)
    try {
      if (e.isDirectory()) total += dirSize(p)
      else total += fs.statSync(p).size
    } catch { /* fichier verrouillé/supprimé : ignore */ }
  }
  return total
}

export function registerSystemIpc() {
  ipcMain.handle('system:version', () => app.getVersion())

  // Statut courant du modèle de transcription (loading | ready | unavailable | error).
  ipcMain.handle('whisper:status', () => getWhisperStatus())

  // Usage du dossier de stockage + espace disque (pour la jauge NavRail).
  ipcMain.handle('system:storage-usage', () => {
    const dir = getSettings().storageDir
    const usedBytes = dirSize(dir)
    let totalBytes = 0
    let freeBytes = 0
    try {
      const st = fs.statfsSync(dir) // Node ≥ 18.15 / Electron récent
      totalBytes = st.blocks * st.bsize
      freeBytes = st.bavail * st.bsize
    } catch { /* statfs indisponible : on n'affichera que l'utilisé */ }
    return { usedBytes, totalBytes, freeBytes }
  })

  // Ouvre le dossier de stockage dans l'explorateur.
  ipcMain.handle('system:open-path', () => {
    const dir = getSettings().storageDir
    try { fs.mkdirSync(dir, { recursive: true }) } catch { /* ignore */ }
    return shell.openPath(dir)
  })

  // Ouvre une URL externe (ex : fiche Notion) dans le navigateur par défaut.
  ipcMain.handle('system:open-external', (e, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) return shell.openExternal(url)
    return false
  })

  // Résolution + fréquence d'image de l'écran principal (capture auto).
  ipcMain.handle('system:display', () => {
    try {
      const d = screen.getPrimaryDisplay()
      const w = Math.round(d.size.width * d.scaleFactor)
      const h = Math.round(d.size.height * d.scaleFactor)
      const fps = Math.max(1, Math.min(120, Math.round(d.displayFrequency || 30)))
      return { width: w, height: h, fps }
    } catch {
      return { width: 0, height: 0, fps: 30 }
    }
  })
  ipcMain.handle('system:sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
      })
      return sources.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.id.startsWith('screen') ? 'screen' : 'window',
        thumbnail: s.thumbnail?.toDataURL?.() || null,
      }))
    } catch (e) {
      console.error('getSources failed', e)
      return []
    }
  })
}
