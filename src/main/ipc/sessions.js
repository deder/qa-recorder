import { ipcMain, BrowserWindow, dialog } from 'electron'
import { join, basename } from 'node:path'
import fs from 'node:fs'
import { listSessions, loadSession, saveBugs, deleteSession, writeMeta, readMeta, sessionDir } from '../sessions/store.js'
import { runPipeline } from '../pipeline.js'
import { STATUS } from '../sessions/steps.js'
import { currentId, abortRecording } from '../recorder.js'

function broadcast(channel, payload) {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload)
}

export function registerSessionsIpc() {
  ipcMain.handle('sessions:list', () => listSessions())
  ipcMain.handle('sessions:load', (e, id) => loadSession(id))
  ipcMain.handle('sessions:save-bugs', (e, id, bugs) => saveBugs(id, bugs))

  // Lance (ou relance) le traitement d'une session.
  ipcMain.handle('sessions:process', (e, id, fromStart) => {
    runPipeline(id, !!fromStart, broadcast)
    return true
  })

  // Supprime une session (en avortant l'enregistrement si c'est la session en cours).
  ipcMain.handle('sessions:delete', async (e, id) => {
    if (currentId() === id) {
      try { await abortRecording() } catch (err) { console.error(err) }
    }
    return deleteSession(id)
  })

  // Importe un fichier MKV/MP4 comme nouvelle session et lance son traitement.
  ipcMain.handle('sessions:import', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const res = await dialog.showOpenDialog(win, {
      title: 'Importer une vidéo de session',
      properties: ['openFile'],
      filters: [{ name: 'Vidéo (MKV, MP4)', extensions: ['mkv', 'mp4'] }],
    })
    if (res.canceled || !res.filePaths.length) return null
    const src = res.filePaths[0]
    const ext = src.toLowerCase().endsWith('.mkv') ? 'mkv' : 'mp4'
    const id = 'session-' + Date.now()
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const date = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`
    const base = basename(src).replace(/\.(mkv|mp4)$/i, '')
    fs.mkdirSync(sessionDir(id), { recursive: true })
    // Session créée tout de suite (l'UI peut afficher "Traitement en cours" sans attendre la copie).
    writeMeta(id, {
      id,
      name: `Import — ${base}`,
      createdAt: now.toISOString(),
      date,
      durationSec: 0,
      status: STATUS.PROCESSING,
      procStep: 0,
      procPct: 0,
      hue: '#8218E2',
      imported: true,
    })
    // Copie (potentiellement lourde) + pipeline en tâche de fond — ne bloque pas le retour.
    ;(async () => {
      try {
        broadcast('sessions:progress', { id, status: STATUS.PROCESSING, step: 0, pct: 3, detail: 'Copie du fichier importé…' })
        await fs.promises.copyFile(src, join(sessionDir(id), `session.${ext}`))
        runPipeline(id, false, broadcast)
      } catch (err) {
        console.error('import failed', err)
        const m = readMeta(id)
        writeMeta(id, { ...m, status: STATUS.ERREUR, error: 'Échec de l’import du fichier : ' + (err.message || err) })
        broadcast('sessions:progress', { id, status: STATUS.ERREUR, step: 0, error: 'Échec de l’import du fichier.' })
      }
    })()
    return id
  })
}
