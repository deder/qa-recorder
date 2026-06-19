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
    onProgress: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('sessions:progress', handler)
      return () => ipcRenderer.removeListener('sessions:progress', handler)
    },
  },
  recording: {
    audioDevices: () => ipcRenderer.invoke('recording:audio-devices'),
    start: (opts) => ipcRenderer.invoke('recording:start', opts),
    pause: () => ipcRenderer.invoke('recording:pause'),
    resume: () => ipcRenderer.invoke('recording:resume'),
    stop: () => ipcRenderer.invoke('recording:stop'),
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
  },
  // URL pour le <video> de relecture
  mediaUrl: (sessionId) => `media://local/${sessionId}/session.mp4`,
}

contextBridge.exposeInMainWorld('api', api)
