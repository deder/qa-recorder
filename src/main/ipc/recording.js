import { ipcMain, BrowserWindow } from 'electron'
import { writeMeta } from '../sessions/store.js'
import { STATUS } from '../sessions/steps.js'
import { listAudioDevices } from '../ffmpeg.js'
import { startRecording, pauseRecording, resumeRecording, stopRecording } from '../recorder.js'
import { runPipeline } from '../pipeline.js'

function broadcast(channel, payload) {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload)
}

export function registerRecordingIpc() {
  ipcMain.handle('recording:audio-devices', () => listAudioDevices())

  ipcMain.handle('recording:start', (e, opts) => {
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
    startRecording(id, opts || {})
    return id
  })

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
