import { ipcMain, BrowserWindow } from 'electron'
import { listSessions, loadSession, saveBugs, deleteSession } from '../sessions/store.js'
import { runPipeline } from '../pipeline.js'
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
}
