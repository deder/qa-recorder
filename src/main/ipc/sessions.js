import { ipcMain, BrowserWindow, dialog, shell } from 'electron'
import { join, basename } from 'node:path'
import fs from 'node:fs'
import { listSessions, loadSession, saveBugs, deleteSession, writeMeta, readMeta, sessionDir } from '../sessions/store.js'
import { runPipeline, abortPipeline } from '../pipeline.js'
import { STATUS } from '../sessions/steps.js'
import { currentId, abortRecording } from '../recorder.js'
import { getSettings } from '../settings-store.js'
import { pushBugsToNotion } from '../notion.js'
import { exportSessionPdf } from '../report.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

  // Supprime une session (en avortant enregistrement ET traitement en cours).
  ipcMain.handle('sessions:delete', async (e, id) => {
    if (currentId() === id) {
      try { await abortRecording() } catch (err) { console.error(err) }
    }
    abortPipeline(id) // tue ffmpeg/whisper en cours pour libérer les fichiers
    // Les process tués relâchent les verrous avec un léger délai → quelques tentatives.
    for (let i = 0; i < 5; i++) {
      if (deleteSession(id)) return true
      await sleep(250)
    }
    return deleteSession(id)
  })

  // Génère un rapport PDF de la session et l'ouvre dans le lecteur par défaut.
  ipcMain.handle('sessions:export-pdf', async (e, id) => {
    try {
      const out = await exportSessionPdf(id)
      await shell.openPath(out)
      return { ok: true, path: out }
    } catch (err) {
      console.error('export-pdf failed', err)
      return { ok: false, error: String(err.message || err) }
    }
  })

  // Crée des fiches Notion à partir des bugs (sélectionnés par bugIds, ou tous).
  // Anti-doublon : un bug déjà poussé (notionPageId présent) est sauté.
  ipcMain.handle('notion:push-bugs', async (e, id, bugIds) => {
    const session = loadSession(id)
    if (!session) return { ok: false, error: 'Session introuvable.' }
    const { notionToken, notionDatabaseId } = getSettings()
    const all = session.bugs || []
    const idSet = Array.isArray(bugIds) && bugIds.length ? new Set(bugIds) : null
    const selected = all.filter((b) => !idSet || idSet.has(b.id))
    const toPush = selected.filter((b) => !b.notionPageId)
    const skipped = selected.length - toPush.length
    if (!toPush.length) return { ok: true, created: 0, skipped, failed: 0, results: [] }

    let results
    try {
      results = await pushBugsToNotion(session.meta, toPush, {
        token: notionToken,
        databaseId: notionDatabaseId,
        onProgress: (p) => broadcast('notion:progress', { id, ...p }),
      })
    } catch (err) {
      return { ok: false, error: String(err.message || err) }
    }

    // Persiste notionUrl/notionPageId sur les bugs créés avec succès.
    const ok = new Map(results.filter((r) => r.ok).map((r) => [r.bugId, r]))
    if (ok.size) {
      const next = all.map((b) => (ok.has(b.id) ? { ...b, notionPageId: ok.get(b.id).notionPageId, notionUrl: ok.get(b.id).notionUrl } : b))
      saveBugs(id, next)
    }
    const created = ok.size
    const failed = results.filter((r) => !r.ok).length
    return { ok: failed === 0, created, skipped, failed, error: results.find((r) => !r.ok)?.error, results }
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
      procPct: 3,
      procDetail: 'Copie du fichier importé…',
      hue: '#8218E2',
      imported: true,
      copying: true, // tant que true, l'écran Traitement n'auto-lance pas le pipeline
    })
    // Copie (potentiellement lourde) + pipeline en tâche de fond — ne bloque pas le retour.
    ;(async () => {
      try {
        broadcast('sessions:progress', { id, status: STATUS.PROCESSING, step: 0, pct: 3, detail: 'Copie du fichier importé…' })
        await fs.promises.copyFile(src, join(sessionDir(id), `session.${ext}`))
        const m = readMeta(id)
        writeMeta(id, { ...m, copying: false })
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
