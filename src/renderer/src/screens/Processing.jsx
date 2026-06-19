import { useEffect, useState } from 'react'
import { PROC_STEPS } from '../lib/tokens.js'

const api = window.api

export default function Processing({ sessionId, onBack, onOpenReplay }) {
  const [name, setName] = useState('')
  const [step, setStep] = useState(0)
  const [pct, setPct] = useState(0)
  const [status, setStatus] = useState('PROCESSING')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api.sessions.load(sessionId).then((res) => {
      if (!alive || !res) return
      setName(res.meta.name)
      setStep(res.meta.procStep || 0)
      setPct(res.meta.procPct || 0)
      setStatus(res.meta.status)
      setError(res.meta.error || '')
      if (res.meta.status === 'PROCESSING') api.sessions.process(sessionId, false)
    })
    const off = api.sessions.onProgress((p) => {
      if (p.id !== sessionId) return
      setStep(p.step)
      setPct(p.pct)
      setStatus(p.done ? 'PRETE' : p.status)
      if (p.error) setError(p.error)
      else if (p.status === 'PROCESSING') setError('')
    })
    return () => { alive = false; off() }
  }, [sessionId])

  const complete = status === 'PRETE'
  const isError = status === 'ERREUR'

  const relaunch = () => {
    setStatus('PROCESSING')
    setPct(0)
    setError('')
    // fromStart=false : reprend à la première étape non terminée (ne recalcule pas les étapes réussies)
    api.sessions.process(sessionId, false)
  }

  const stepState = (i) => {
    if (complete) return 'done'
    if (i < step) return 'done'
    if (i === step) return isError ? 'error' : 'current'
    return 'pending'
  }

  const bgFor = { done: '#E8F5EC', current: '#E5F2FD', error: '#FDECEA', pending: '#F9FAFB' }
  const ringFor = { done: '#317D51', current: '#0C8CE9', error: '#E64C35', pending: '#E5E7EB' }

  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: 600, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 36, display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#949DB2' }}>{complete ? 'Traitement terminé' : 'Traitement en cours'}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#000054', margin: '8px 0 0' }}>{name}</h2>
          <div style={{ fontSize: 13, color: '#595987', marginTop: 6 }}>La session reste verrouillée jusqu’à la fin de l’analyse.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {PROC_STEPS.map((label, i) => {
            const st = stepState(i)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, background: bgFor[st] }}>
                <div style={{ width: 30, height: 30, flex: 'none', borderRadius: 100, border: `2px solid ${ringFor[st]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: ringFor[st], background: '#fff' }}>
                  {st === 'current' ? (
                    <div style={{ width: 14, height: 14, border: '2px solid #C9DCF2', borderTopColor: '#0C8CE9', borderRadius: 100, animation: 'spin 0.8s linear infinite' }} />
                  ) : st === 'done' ? '✓' : st === 'error' ? '!' : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#000054' }}>{label}</div>
                  {st === 'current' && <div style={{ fontSize: 12, color: '#0862A3', marginTop: 2 }}>En cours… {pct}%</div>}
                  {st === 'done' && <div style={{ fontSize: 12, color: '#317D51', marginTop: 2 }}>Terminé</div>}
                  {st === 'error' && <div style={{ fontSize: 12, color: '#A13525', marginTop: 2 }}>Échec du traitement</div>}
                </div>
                {st === 'done' && <span style={{ color: '#317D51', fontSize: 16 }}>✓</span>}
              </div>
            )
          })}
        </div>

        {isError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 8, background: '#FDECEA', border: '1px solid #EB6F5D' }}>
            <span style={{ color: '#A13525', fontSize: 16 }}>⚠</span>
            <div style={{ flex: 1, fontSize: 13, color: '#A13525', wordBreak: 'break-word' }}>{error || 'Le traitement a échoué. Vérifie tes réglages puis relance.'}</div>
            <button className="hov-red" onClick={relaunch} style={{ height: 34, padding: '0 16px', borderRadius: 8, background: '#E64C35', color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>↻ Relancer</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="hov-grey" onClick={onBack} style={{ height: 40, padding: '0 18px', borderRadius: 8, border: '1px solid #E0E0E0', background: '#fff', color: '#000054', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>← Retour aux sessions</button>
          {complete && (
            <button className="hov-green" onClick={() => onOpenReplay(sessionId)} style={{ height: 40, padding: '0 18px', borderRadius: 8, background: '#47B375', color: '#fff', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>Ouvrir la relecture →</button>
          )}
        </div>
      </div>
    </div>
  )
}
