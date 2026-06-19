import { useEffect, useRef, useState } from 'react'
import { clock } from '../lib/format.js'

const api = window.api
const N_BARS = 16

// VU-mètre RÉEL branché sur le micro sélectionné (Web Audio). Silence => barres plates.
// onStatus({ available, hasSound }) : dispo du micro + détection d'un son réel (latché).
const SOUND_THRESHOLD = 14 // seuil (0-255) au-dessus duquel on considère qu'il y a du son
function MicVuMeter({ deviceId, active, onStatus }) {
  const barsRef = useRef([])
  const cbRef = useRef(onStatus)
  cbRef.current = onStatus
  useEffect(() => {
    if (!active) {
      barsRef.current.forEach((el) => el && (el.style.transform = 'scaleY(0.04)'))
      return
    }
    let stopped = false
    let raf, ctx, stream
    let available = false
    let hasSound = false
    const emit = () => cbRef.current?.({ available, hasSound })
    emit() // reset à false au (re)montage / changement de micro
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
        available = true
        emit()
        ctx = new AudioContext()
        if (ctx.state === 'suspended') await ctx.resume()
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 128
        analyser.smoothingTimeConstant = 0.75
        src.connect(analyser)
        const bins = new Uint8Array(analyser.frequencyBinCount)
        const loop = () => {
          if (stopped) return
          analyser.getByteFrequencyData(bins)
          const usable = Math.floor(bins.length * 0.7)
          let peak = 0
          for (let i = 0; i < N_BARS; i++) {
            const a = Math.floor((i / N_BARS) * usable)
            const b = Math.max(a + 1, Math.floor(((i + 1) / N_BARS) * usable))
            let m = 0
            for (let j = a; j < b; j++) m = Math.max(m, bins[j])
            if (m > peak) peak = m
            const h = Math.max(0.04, Math.min(1, (m / 255) * 1.25))
            const el = barsRef.current[i]
            if (el) el.style.transform = `scaleY(${h})`
          }
          if (!hasSound && peak >= SOUND_THRESHOLD) { hasSound = true; emit() }
          raf = requestAnimationFrame(loop)
        }
        loop()
      } catch (e) {
        available = false
        hasSound = false
        emit()
        console.warn('VU micro indisponible:', e?.message || e)
      }
    }
    start()
    return () => { stopped = true; if (raf) cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); if (ctx) ctx.close().catch(() => {}) }
  }, [deviceId, active])

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32, padding: '0 2px' }}>
      {Array.from({ length: N_BARS }).map((_, i) => (
        <div key={i} ref={(el) => (barsRef.current[i] = el)} style={{ flex: 1, height: '100%', borderRadius: 2, background: 'linear-gradient(to top, #47B375, #47B375 60%, #ED6C02 80%, #E64C35)', transformOrigin: 'bottom', transform: 'scaleY(0.04)', transition: 'transform 60ms linear' }} />
      ))}
    </div>
  )
}

export default function Record({ rec, onStart, onPause, onResume, onStop, onCancel }) {
  const [sources, setSources] = useState([])
  const [sourceType, setSourceType] = useState('screen')
  const [mics, setMics] = useState([])
  const [micId, setMicId] = useState('')
  const [dshowNames, setDshowNames] = useState([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [micStatus, setMicStatus] = useState({ available: false, hasSound: false })
  const [display, setDisplay] = useState({ width: 0, height: 0, fps: 30 })

  const idle = !rec.active
  const recording = rec.state === 'recording'
  const paused = rec.state === 'paused'
  const recT = rec.elapsed

  useEffect(() => {
    let cancelled = false
    async function initMics() {
      try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((t) => t.stop()) } catch { /* refusé */ }
      const devs = await navigator.mediaDevices.enumerateDevices().catch(() => [])
      const ins = devs.filter((d) => d.kind === 'audioinput' && d.deviceId && d.deviceId !== 'communications')
      if (cancelled) return
      setMics(ins)
      const real = ins.find((d) => d.deviceId !== 'default') || ins[0]
      if (real) setMicId(real.deviceId)
    }
    initMics()
    api.system.sources().then(setSources)
    api.system.display().then(setDisplay)
    api.recording.audioDevices().then(setDshowNames)
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    setName(`Session — ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`)
    return () => { cancelled = true }
  }, [])

  const screenSources = sources.filter((s) => s.type === 'screen')
  const windowSources = sources.filter((s) => s.type === 'window')
  const preview = (sourceType === 'screen' ? screenSources : windowSources)[0] || screenSources[0]

  const selectedMic = mics.find((m) => m.deviceId === micId)
  const micLabel = selectedMic?.label || ''
  const cleanLabel = micLabel.replace(/^Par défaut\s*-\s*/i, '').replace(/^Default\s*-\s*/i, '').trim()
  const dshowName = dshowNames.find((n) => n === cleanLabel || cleanLabel.includes(n) || n.includes(cleanLabel)) || dshowNames[0] || cleanLabel || null

  const micReady = micStatus.available
  const soundOk = micStatus.hasSound
  const canRecord = !!micId && micReady && soundOk
  const blockMsg = !micId || !micReady
    ? 'Micro indisponible — branche un micro et autorise l’accès au micro.'
    : !soundOk
      ? 'Aucun son détecté — parle dans le micro pour vérifier avant d’enregistrer.'
      : null

  const start = async () => {
    if (!canRecord) return
    setBusy(true)
    await onStart({
      name,
      sourceType,
      sourceTitle: sourceType === 'window' ? preview?.name : null,
      sourceLabel: preview?.name || (sourceType === 'screen' ? 'Écran entier' : 'Fenêtre'),
      micName: dshowName,
      fps: String(display.fps || 30),
    })
    setBusy(false)
  }
  const stop = async () => { setBusy(true); await onStop(); setBusy(false) }

  const card = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }
  const radio = (on) => ({ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: on ? '2px solid #0C8CE9' : '1px solid #E0E0E0', borderRadius: 8, background: on ? '#F4FAFE' : '#fff', fontSize: 13, fontWeight: on ? 600 : 500, color: on ? '#0862A3' : '#595987', cursor: idle ? 'pointer' : 'default' })

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 13, color: '#595987' }}>Sessions / {idle ? 'Nouvelle' : 'En cours'}</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#000054', margin: '4px 0 0' }}>{idle ? 'Nouvelle session' : 'Enregistrement en cours'}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#000054' }}>Source vidéo</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div onClick={() => idle && setSourceType('screen')} style={radio(sourceType === 'screen')}>
                <span style={{ width: 14, height: 14, borderRadius: 100, border: sourceType === 'screen' ? '4px solid #0C8CE9' : '1px solid #C0C3CE' }} />Écran entier
              </div>
              <div onClick={() => idle && setSourceType('window')} style={radio(sourceType === 'window')}>
                <span style={{ width: 14, height: 14, borderRadius: 100, border: sourceType === 'window' ? '4px solid #0C8CE9' : '1px solid #C0C3CE' }} />Une fenêtre
              </div>
            </div>
            <div style={{ height: 120, borderRadius: 8, background: '#F4F6FA', border: '1px solid #E9ECF2', overflow: 'hidden', position: 'relative' }}>
              {preview?.thumbnail ? <img src={preview.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#949DB2', fontSize: 12 }}>Aperçu indisponible</div>}
              <div style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 10, fontWeight: 600, color: '#595987', background: 'rgba(255,255,255,0.85)', padding: '2px 6px', borderRadius: 4 }}>{preview?.name || 'Aperçu'}</div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#000054' }}>Micro</div>
            <select value={micId} onChange={(e) => setMicId(e.target.value)} disabled={!idle} style={{ height: 42, padding: '0 14px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 14, color: '#000054', background: '#fff', fontFamily: 'Mulish' }}>
              {mics.length === 0 && <option value="">Aucun micro détecté</option>}
              {mics.map((m) => <option key={m.deviceId} value={m.deviceId}>{m.label || 'Micro'}</option>)}
            </select>
            <div>
              <div style={{ fontSize: 12, color: '#595987', marginBottom: 6 }}>Niveau d’entrée {idle ? '' : '(figé pendant l’enregistrement)'}</div>
              <MicVuMeter deviceId={micId} active={idle} onStatus={setMicStatus} />
              {idle && (
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: canRecord ? '#317D51' : '#A13525' }}>
                  {canRecord ? '✓ Micro OK, son détecté' : !micReady ? '○ Micro indisponible' : '○ En attente d’un son…'}
                </div>
              )}
            </div>
          </div>

          <div style={{ ...card, gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#595987' }}>Nom de la session</div>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={!idle} style={{ height: 42, padding: '0 14px', border: '1px solid #E0E0E0', borderRadius: 8, fontFamily: 'Mulish', fontSize: 14, color: '#000054', outline: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0d1b2a', aspectRatio: '16 / 9', border: '1px solid #E5E7EB' }}>
            {preview?.thumbnail ? <img src={preview.thumbnail} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: idle ? 0.85 : 1 }} /> : <div style={{ position: 'absolute', inset: 0, background: '#F4F6FA' }} />}

            {recording && (
              <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(13,15,25,0.74)', padding: '6px 12px', borderRadius: 100 }}>
                <span style={{ width: 9, height: 9, borderRadius: 100, background: '#E64C35', animation: 'recblink 1.1s infinite' }} />
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.5px' }}>REC {clock(recT)}</span>
              </div>
            )}
            {paused && (
              <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(13,15,25,0.74)', padding: '6px 12px', borderRadius: 100 }}>
                <span style={{ color: '#FF9800', fontSize: 12 }}>❚❚</span>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.5px' }}>En pause · {clock(recT)}</span>
              </div>
            )}

            {!idle && (
              <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, maxWidth: '86%', background: 'rgba(13,15,25,0.66)', border: '1px solid rgba(255,255,255,0.16)', padding: '9px 16px', borderRadius: 100 }}>
                <span style={{ width: 22, height: 22, borderRadius: 100, background: '#0C8CE9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>🎙</span>
                <span style={{ color: 'rgba(255,255,255,0.92)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.3 }}>Pour chaque anomalie, dites le mot <b style={{ color: '#fff' }}>« bug »</b> puis décrivez-la.</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 18px' }}>
            {idle && (
              <>
                <button
                  className={canRecord ? 'hov-red' : ''}
                  disabled={busy || !canRecord}
                  onClick={start}
                  title={blockMsg || ''}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, height: 44, padding: '0 22px', borderRadius: 8, background: canRecord ? '#E64C35' : '#F0C9C2', color: '#fff', fontSize: 14, fontWeight: 700, cursor: canRecord ? 'pointer' : 'not-allowed', opacity: busy ? 0.6 : 1 }}
                >
                  <span style={{ width: 11, height: 11, borderRadius: 100, background: '#fff' }} />Enregistrer
                </button>
                <div style={{ fontSize: 13, color: blockMsg ? '#A13525' : '#595987', maxWidth: 360 }}>
                  {blockMsg || `Prêt · ${preview?.name || 'écran'}${display.width ? ` · ${display.width}×${display.height} · ${display.fps} fps` : ''}`}
                </div>
                <button className="hov-grey" onClick={onCancel} style={{ marginLeft: 'auto', height: 40, padding: '0 16px', borderRadius: 8, border: '1px solid #E0E0E0', background: '#fff', color: '#595987', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              </>
            )}
            {recording && (
              <>
                <button className="hov-grey" onClick={onPause} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', borderRadius: 8, background: '#fff', border: '1px solid #E0E0E0', color: '#000054', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>❚❚ Pause</button>
                <button className="hov-navy" disabled={busy} onClick={stop} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', borderRadius: 8, background: '#000054', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>■ Arrêter</button>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#E64C35' }}><span style={{ width: 9, height: 9, borderRadius: 100, background: '#E64C35', animation: 'recblink 1.1s infinite' }} />{clock(recT)}</div>
              </>
            )}
            {paused && (
              <>
                <button className="hov-blue" onClick={onResume} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 22px', borderRadius: 8, background: '#0C8CE9', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>▶ Reprendre</button>
                <button className="hov-navy" disabled={busy} onClick={stop} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', borderRadius: 8, background: '#000054', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>■ Arrêter</button>
                <div style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: '#ED6C02' }}>En pause · {clock(recT)}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
