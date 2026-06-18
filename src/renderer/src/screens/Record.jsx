import { useEffect, useRef, useState } from 'react'
import { clock } from '../lib/format.js'

const api = window.api

function VuMeter() {
  const bars = Array.from({ length: 16 })
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32, padding: '0 2px' }}>
      {bars.map((_, i) => (
        <div key={i} style={{ flex: 1, height: '100%', borderRadius: 2, background: 'linear-gradient(to top, #47B375, #47B375 60%, #ED6C02 80%, #E64C35)', transformOrigin: 'bottom', transform: 'scaleY(0.3)', animation: 'vu 0.9s ease-in-out infinite', animationDelay: `${(i % 8) * 70}ms` }} />
      ))}
    </div>
  )
}

export default function Record({ onStop, onCancel }) {
  const [sources, setSources] = useState([])
  const [sourceType, setSourceType] = useState('screen')
  const [mics, setMics] = useState([])
  const [mic, setMic] = useState('')
  const [name, setName] = useState('')
  const [recState, setRecState] = useState('idle')
  const [recT, setRecT] = useState(0)
  const [busy, setBusy] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    api.system.sources().then(setSources)
    api.recording.audioDevices().then((list) => {
      setMics(list)
      if (list.length) setMic(list[0])
    })
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    setName(`Session — ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`)
  }, [])

  useEffect(() => {
    if (recState === 'recording') timerRef.current = setInterval(() => setRecT((t) => t + 1), 1000)
    else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [recState])

  const screenSources = sources.filter((s) => s.type === 'screen')
  const windowSources = sources.filter((s) => s.type === 'window')
  const preview = (sourceType === 'screen' ? screenSources : windowSources)[0] || screenSources[0]

  const recording = recState === 'recording'
  const paused = recState === 'paused'
  const idle = recState === 'idle'

  const start = async () => {
    setBusy(true)
    await api.recording.start({
      name,
      sourceType,
      sourceTitle: sourceType === 'window' ? preview?.name : null,
      sourceLabel: preview?.name || (sourceType === 'screen' ? 'Écran entier' : 'Fenêtre'),
      micName: mic || null,
      fps: '30',
    })
    setRecState('recording')
    setBusy(false)
  }
  const pause = async () => { await api.recording.pause(); setRecState('paused') }
  const resume = async () => { await api.recording.resume(); setRecState('recording') }
  const stop = async () => {
    setBusy(true)
    const id = await api.recording.stop()
    setRecState('idle'); setRecT(0); setBusy(false)
    if (id) onStop(id)
  }

  const card = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }
  const radio = (active) => ({ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: active ? '2px solid #0C8CE9' : '1px solid #E0E0E0', borderRadius: 8, background: active ? '#F4FAFE' : '#fff', fontSize: 13, fontWeight: active ? 600 : 500, color: active ? '#0862A3' : '#595987', cursor: 'pointer' })

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 13, color: '#595987' }}>Sessions / Nouvelle</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#000054', margin: '4px 0 0' }}>Nouvelle session</h1>
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
            <select value={mic} onChange={(e) => setMic(e.target.value)} disabled={!idle} style={{ height: 42, padding: '0 14px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 14, color: '#000054', background: '#fff', fontFamily: 'Mulish' }}>
              {mics.length === 0 && <option value="">Aucun micro détecté</option>}
              {mics.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <div>
              <div style={{ fontSize: 12, color: '#595987', marginBottom: 6 }}>Niveau d’entrée</div>
              <VuMeter />
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
                <button className="hov-red" disabled={busy} onClick={start} style={{ display: 'flex', alignItems: 'center', gap: 9, height: 44, padding: '0 22px', borderRadius: 8, background: '#E64C35', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 100, background: '#fff' }} />Enregistrer
                </button>
                <div style={{ fontSize: 13, color: '#595987' }}>Prêt · {preview?.name || 'écran'}{mic ? ` + ${mic.slice(0, 28)}${mic.length > 28 ? '…' : ''}` : ' (sans micro)'}</div>
                <button className="hov-grey" onClick={onCancel} style={{ marginLeft: 'auto', height: 40, padding: '0 16px', borderRadius: 8, border: '1px solid #E0E0E0', background: '#fff', color: '#595987', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              </>
            )}
            {recording && (
              <>
                <button className="hov-grey" onClick={pause} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', borderRadius: 8, background: '#fff', border: '1px solid #E0E0E0', color: '#000054', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>❚❚ Pause</button>
                <button className="hov-navy" disabled={busy} onClick={stop} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', borderRadius: 8, background: '#000054', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>■ Arrêter</button>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#E64C35' }}><span style={{ width: 9, height: 9, borderRadius: 100, background: '#E64C35', animation: 'recblink 1.1s infinite' }} />{clock(recT)}</div>
              </>
            )}
            {paused && (
              <>
                <button className="hov-blue" onClick={resume} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 22px', borderRadius: 8, background: '#0C8CE9', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>▶ Reprendre</button>
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
