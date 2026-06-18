import { ipcMain, desktopCapturer, app } from 'electron'

export function registerSystemIpc() {
  ipcMain.handle('system:version', () => app.getVersion())
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
