import { contextBridge, ipcRenderer } from 'electron'

const api = {
  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    toggleMaximize: () => ipcRenderer.send('win:toggle-maximize'),
    close: () => ipcRenderer.send('win:close'),
  },
  sessions: {
    list: () => ipcRenderer.invoke('sessions:list'),
    load: (id) => ipcRenderer.invoke('sessions:load', id),
    saveBugs: (id, bugs) => ipcRenderer.invoke('sessions:save-bugs', id, bugs),
    create: (name) => ipcRenderer.invoke('sessions:create', name),
    process: (id, fromStart) => ipcRenderer.invoke('sessions:process', id, fromStart),
    remove: (id) => ipcRenderer.invoke('sessions:delete', id),
    import: () => ipcRenderer.invoke('sessions:import'),
    exportPdf: (id) => ipcRenderer.invoke('sessions:export-pdf', id),
    pushToNotion: (id, bugIds) => ipcRenderer.invoke('notion:push-bugs', id, bugIds),
    onProgress: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('sessions:progress', handler)
      return () => ipcRenderer.removeListener('sessions:progress', handler)
    },
    onNotionProgress: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('notion:progress', handler)
      return () => ipcRenderer.removeListener('notion:progress', handler)
    },
  },
  recording: {
    audioDevices: () => ipcRenderer.invoke('recording:audio-devices'),
    start: (opts) => ipcRenderer.invoke('recording:start', opts),
    pause: () => ipcRenderer.invoke('recording:pause'),
    resume: () => ipcRenderer.invoke('recording:resume'),
    stop: () => ipcRenderer.invoke('recording:stop'),
    // Capture native (mode fenêtre) : streaming des chunks webm vers le main.
    windowChunk: (id, chunk) => ipcRenderer.invoke('recording:window-chunk', id, chunk),
    windowStop: (id) => ipcRenderer.invoke('recording:window-stop', id),
    windowAbort: (id) => ipcRenderer.invoke('recording:window-abort', id),
    // Arrêt automatique déclenché par le main (ex. fenêtre capturée fermée).
    onAutoStopped: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('recording:auto-stopped', handler)
      return () => ipcRenderer.removeListener('recording:auto-stopped', handler)
    },
  },
  // Statut du modèle de transcription (préchargé au démarrage).
  whisper: {
    status: () => ipcRenderer.invoke('whisper:status'),
    onStatus: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('whisper:status', handler)
      return () => ipcRenderer.removeListener('whisper:status', handler)
    },
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (partial) => ipcRenderer.invoke('settings:set', partial),
    browseFolder: () => ipcRenderer.invoke('settings:browse-folder'),
    openrouterCredits: () => ipcRenderer.invoke('openrouter:credits'),
  },
  system: {
    version: () => ipcRenderer.invoke('system:version'),
    sources: () => ipcRenderer.invoke('system:sources'),
    display: () => ipcRenderer.invoke('system:display'),
    storageUsage: () => ipcRenderer.invoke('system:storage-usage'),
    openStorage: () => ipcRenderer.invoke('system:open-path'),
    openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
  },
  // URL pour le <video> de relecture
  mediaUrl: (sessionId) => `media://local/${sessionId}/session.mp4`,
}

contextBridge.exposeInMainWorld('api', api)
