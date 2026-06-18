import { ipcMain, BrowserWindow } from 'electron'
import { listSessions, loadSession, saveBugs } from '../sessions/store.js'
import { runPipeline } from '../pipeline.js'

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
}
