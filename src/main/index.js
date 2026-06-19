import { app, BrowserWindow, protocol, net, session } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { getSessionsRoot } from './sessions/store.js'
import { cleanupMockSessions } from './sessions/seed.js'
import { registerWindowIpc } from './ipc/window.js'
import { registerSettingsIpc } from './ipc/settings.js'
import { registerSessionsIpc } from './ipc/sessions.js'
import { registerSystemIpc } from './ipc/system.js'
import { registerRecordingIpc } from './ipc/recording.js'

// Protocole privilégié pour servir les vidéos de session (avec support des Range requests).
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
])

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    frame: false,
    backgroundColor: '#FAFBFB',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.once('ready-to-show', () => win.show())

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // media://local/<sessionId>/session.mp4  ->  <sessionsRoot>/<sessionId>/session.mp4
  protocol.handle('media', (request) => {
    const url = new URL(request.url)
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    const filePath = join(getSessionsRoot(), rel)
    return net.fetch(pathToFileURL(filePath).toString())
  })

  // Autorise micro / capture pour le VU-mètre et l'enregistrement (outil interne).
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(true))
  session.defaultSession.setPermissionCheckHandler(() => true)

  try {
    cleanupMockSessions()
  } catch (e) {
    console.error('cleanup failed', e)
  }

  registerWindowIpc()
  registerSettingsIpc()
  registerSessionsIpc()
  registerSystemIpc()
  registerRecordingIpc()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
