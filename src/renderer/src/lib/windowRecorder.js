// Capture native du mode FENÊTRE (côté renderer).
// Contrairement à gdigrab (qui fige la résolution à la taille initiale), la capture
// desktopCapturer + MediaRecorder suit le redimensionnement de la fenêtre (WGC Windows).
// Les chunks webm sont streamés au main au fil de l'eau (recording:window-chunk) pour
// éviter de garder toute la vidéo en mémoire — important pour les longues sessions.

const api = window.api

function pickMime() {
  const cands = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  for (const c of cands) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  }
  return 'video/webm'
}

// Démarre la capture d'une fenêtre et renvoie un contrôleur { pause, resume, stop, abort }.
export async function startWindowCapture({ id, sourceId, micDeviceId, onEnded }) {
  const video = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId, maxWidth: 3840, maxHeight: 2160 } },
  })

  let mic = null
  if (micDeviceId) {
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: micDeviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
    } catch {
      mic = null // micro indisponible : on enregistre quand même la vidéo
    }
  }

  const stream = new MediaStream([...video.getVideoTracks(), ...(mic ? mic.getAudioTracks() : [])])
  const mimeType = pickMime()
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })

  // File d'envoi sérialisée : préserve l'ordre des chunks malgré l'async de arrayBuffer().
  let sendChain = Promise.resolve()
  recorder.ondataavailable = (e) => {
    if (!e.data || !e.data.size) return
    const blob = e.data
    sendChain = sendChain.then(async () => {
      const buf = await blob.arrayBuffer()
      await api.recording.windowChunk(id, new Uint8Array(buf))
    }).catch(() => { /* erreur d'écriture : on continue, l'arrêt remontera l'échec */ })
  }

  const stopTracks = () => {
    for (const t of stream.getTracks()) { try { t.stop() } catch { /* noop */ } }
    for (const t of video.getTracks()) { try { t.stop() } catch { /* noop */ } }
    if (mic) for (const t of mic.getTracks()) { try { t.stop() } catch { /* noop */ } }
  }

  // Fenêtre capturée fermée → la piste vidéo se termine → arrêt automatique.
  const vt = video.getVideoTracks()[0]
  if (vt && onEnded) vt.addEventListener('ended', () => onEnded(), { once: true })

  recorder.start(1000) // timeslice 1 s → un chunk/s streamé

  return {
    mimeType,
    pause() { if (recorder.state === 'recording') recorder.pause() },
    resume() { if (recorder.state === 'paused') recorder.resume() },
    // Arrêt normal : stoppe l'enregistreur, vide la file puis finalise côté main (→ pipeline).
    async stop() {
      if (recorder.state !== 'inactive') {
        await new Promise((res) => { recorder.onstop = () => res() ; recorder.stop() })
      }
      stopTracks()
      await sendChain
      await api.recording.windowStop(id)
    },
    // Annulation : on jette le flux et on demande le nettoyage de la session.
    async abort() {
      try { if (recorder.state !== 'inactive') recorder.stop() } catch { /* noop */ }
      stopTracks()
      await sendChain.catch(() => {})
      await api.recording.windowAbort(id)
    },
  }
}
