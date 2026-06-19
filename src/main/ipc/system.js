import { ipcMain, desktopCapturer, app, screen } from 'electron'

export function registerSystemIpc() {
  ipcMain.handle('system:version', () => app.getVersion())

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
