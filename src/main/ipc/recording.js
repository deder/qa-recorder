import { ipcMain, BrowserWindow } from 'electron'
import fs from 'node:fs'
import { join } from 'node:path'
import { writeMeta, sessionDir, deleteSession } from '../sessions/store.js'
import { STATUS } from '../sessions/steps.js'
import { listAudioDevices } from '../ffmpeg.js'
import { startRecording, pauseRecording, resumeRecording, stopRecording } from '../recorder.js'
import { runPipeline } from '../pipeline.js'

// Capture native du mode fenêtre : le renderer enregistre via MediaRecorder et streame
// les chunks webm ici. On les écrit directement dans session.webm.
// (La capture native suit le redimensionnement de la fenêtre, contrairement à gdigrab.)
let windowCapture = null // { id, stream: WriteStream }

function broadcast(channel, payload) {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload)
}

export function registerRecordingIpc() {
  ipcMain.handle('recording:audio-devices', () => listAudioDevices())

  ipcMain.handle('recording:start', async (e, opts) => {
    opts = opts || {}
    const id = 'session-' + Date.now()
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const date = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`
    writeMeta(id, {
      id,
      name: opts?.name || `Session — ${date}`,
      createdAt: now.toISOString(),
      date,
      durationSec: 0,
      status: STATUS.RECORDING,
      hue: '#0C8CE9',
      sources: { screen: opts?.sourceLabel || 'Écran', mic: opts?.micName || '—' },
    })

    if (opts.sourceType === 'window') {
      // Capture native côté renderer (MediaRecorder) : on prépare juste le fichier de
      // sortie webm. Pas de gdigrab ; l'arrêt auto (fenêtre fermée) est géré par la fin
      // de la piste vidéo côté renderer.
      const dir = sessionDir(id)
      fs.mkdirSync(dir, { recursive: true })
      windowCapture = { id, stream: fs.createWriteStream(join(dir, 'session.webm')) }
    } else {
      startRecording(id, opts)
    }
    return id
  })

  // --- Capture native (mode fenêtre) : streaming des chunks depuis le renderer ----------
  ipcMain.handle('recording:window-chunk', (e, id, chunk) => {
    if (!windowCapture || windowCapture.id !== id) return false
    try { windowCapture.stream.write(Buffer.from(chunk)) } catch (err) { console.error('[window-chunk]', err) }
    return true
  })

  ipcMain.handle('recording:window-stop', async (e, id) => {
    if (!windowCapture || windowCapture.id !== id) return null
    const ws = windowCapture.stream
    windowCapture = null
    await new Promise((res) => ws.end(res))
    // Pipeline de traitement (webm → mp4 normalisé → transcription → analyse).
    runPipeline(id, true, broadcast)
    return id
  })

  ipcMain.handle('recording:window-abort', async (e, id) => {
    if (windowCapture && windowCapture.id === id) {
      const ws = windowCapture.stream
      windowCapture = null
      await new Promise((res) => ws.end(res))
    }
    deleteSession(id)
    return true
  })

  // --- Enregistrement écran (ffmpeg/gdigrab) --------------------------------------------
  ipcMain.handle('recording:pause', () => pauseRecording())
  ipcMain.handle('recording:resume', () => resumeRecording())

  ipcMain.handle('recording:stop', async () => {
    const { id } = await stopRecording()
    if (!id) return null
    // Lance le pipeline de traitement (concat → mp4 → transcription → analyse).
    runPipeline(id, true, broadcast)
    return id
  })
}
