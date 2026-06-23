import { app, BrowserWindow, protocol, session } from 'electron'
import { join } from 'node:path'
import fs from 'node:fs'
import { Readable } from 'node:stream'
import { getSessionsRoot } from './sessions/store.js'
import { cleanupMockSessions } from './sessions/seed.js'
import { registerWindowIpc } from './ipc/window.js'
import { registerSettingsIpc } from './ipc/settings.js'
import { registerSessionsIpc } from './ipc/sessions.js'
import { registerSystemIpc } from './ipc/system.js'
import { registerRecordingIpc } from './ipc/recording.js'
import { startWhisperService, stopWhisperService } from './whisper-service.js'

// Diffuse un événement à toutes les fenêtres ouvertes.
function broadcast(channel, payload) {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload)
}

// Protocole privilégié pour servir les vidéos de session (avec support des Range requests).
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
])

function createWindow() {
  // Icône de fenêtre = barre des tâches en dev. En production l'icône est intégrée
  // à l'exécutable par electron-builder (build/icon.ico) et build/ n'est pas packagé,
  // donc existsSync est faux et on retombe proprement sur l'icône de l'exe.
  const iconPath = join(app.getAppPath(), 'build', 'icon.ico')
  const win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    frame: false,
    backgroundColor: '#FAFBFB',
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
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
  // Identité Windows : associe l'app en cours d'exécution au raccourci installé
  // (même valeur que `appId`) -> regroupement et icône cohérents dans la barre des tâches.
  if (process.platform === 'win32') app.setAppUserModelId('fr.allmanager.qarecorder')

  // media://local/<sessionId>/session.mp4  ->  <sessionsRoot>/<sessionId>/session.mp4
  // Le <video> a besoin de VRAIES réponses Range (206 + Content-Range) pour chercher une
  // position : sinon tout saut (clic chapitre, drag de la barre) repart à 0. net.fetch sur
  // file:// renvoie un 200 sans Content-Range (non-seekable) → on sert nous-mêmes la plage
  // via fs (206 partiel, Accept-Ranges, Content-Range).
  protocol.handle('media', (request) => {
    const url = new URL(request.url)
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    const filePath = join(getSessionsRoot(), rel)

    let size
    try { size = fs.statSync(filePath).size } catch { return new Response(null, { status: 404 }) }
    const type = filePath.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4'
    const toWeb = (stream) => Readable.toWeb(stream)

    const range = request.headers.get('range')
    if (!range) {
      return new Response(toWeb(fs.createReadStream(filePath)), {
        status: 200,
        headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' },
      })
    }

    // Range: bytes=start-end (end optionnel)
    const m = /bytes=(\d*)-(\d*)/.exec(range) || []
    let start = m[1] ? parseInt(m[1], 10) : 0
    let end = m[2] ? parseInt(m[2], 10) : size - 1
    if (!Number.isFinite(start) || start < 0 || start >= size) start = 0
    if (!Number.isFinite(end) || end >= size) end = size - 1
    if (end < start) end = size - 1
    return new Response(toWeb(fs.createReadStream(filePath, { start, end })), {
      status: 206,
      headers: {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(end - start + 1),
      },
    })
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

  // Précharge le modèle de transcription (serveur whisper.cpp résident) dès le lancement,
  // sans bloquer l'affichage de la fenêtre. La progression est diffusée via 'whisper:status'.
  startWhisperService(broadcast)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => stopWhisperService())

app.on('window-all-closed', () => {
  stopWhisperService()
  if (process.platform !== 'darwin') app.quit()
})
