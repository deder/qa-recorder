import { useEffect, useMemo, useRef, useState } from 'react'
import { fmt } from '../lib/format.js'

const api = window.api

// Palette de recherche globale (Ctrl/Cmd+K) : sessions + bugs.
export default function SearchPalette({ open, onClose, onOpen }) {
  const [q, setQ] = useState('')
  const [index, setIndex] = useState([])
  const [loading, setLoading] = useState(false)
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)

  // (Re)construit l'index à chaque ouverture.
  useEffect(() => {
    if (!open) return
    setQ('')
    setSel(0)
    setLoading(true)
    let alive = true
    ;(async () => {
      const sessions = (await api.sessions.list()) || []
      const entries = []
      for (const s of sessions) {
        entries.push({ type: 'session', sessionId: s.id, title: s.name, sub: `${s.date || ''} · session`, tc: 0 })
        if (s.status === 'PRETE') {
          const res = await api.sessions.load(s.id)
          for (const b of res?.bugs || []) {
            entries.push({ type: 'bug', sessionId: s.id, title: b.title, sub: `${s.name} · ${fmt(b.tc)}`, tc: b.tc })
          }
        }
      }
      if (alive) { setIndex(entries); setLoading(false) }
    })()
    return () => { alive = false }
  }, [open])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30) }, [open])

  const results = useMemo(() => {
    const query = q.trim().toLowerCase()
    const arr = query
      ? index.filter((e) => `${e.title} ${e.sub}`.toLowerCase().includes(query))
      : index
    return arr.slice(0, 40)
  }, [q, index])

  useEffect(() => { setSel(0) }, [q])

  if (!open) return null

  const choose = (e) => { if (e) { onOpen(e); onClose() } }

  const onKey = (e) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i) => Math.min(results.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[sel]) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,15,25,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh', zIndex: 3000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 600, maxWidth: '92vw', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,84,0.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #E5E7EB' }}>
          <span style={{ color: '#949DB2', fontSize: 16 }}>⌕</span>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Rechercher une session ou un bug…" style={{ border: 'none', outline: 'none', flex: 1, fontFamily: 'Mulish', fontSize: 15, color: '#000054', background: 'transparent' }} />
          {loading && <span style={{ width: 16, height: 16, border: '2px solid #C9DCF2', borderTopColor: '#0C8CE9', borderRadius: 100, animation: 'spin 0.8s linear infinite' }} />}
        </div>
        <div className="qa-scroll" style={{ maxHeight: '52vh', overflow: 'auto', padding: 8 }}>
          {results.length === 0 && (
            <div style={{ color: '#949DB2', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>{loading ? 'Indexation…' : 'Aucun résultat.'}</div>
          )}
          {results.map((e, i) => {
            const active = i === sel
            return (
              <div key={i} onMouseEnter={() => setSel(i)} onClick={() => choose(e)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', background: active ? '#EAF4FD' : 'transparent' }}>
                <span style={{ width: 24, height: 24, flex: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: e.type === 'bug' ? '#FDECEA' : '#E5F2FD', color: e.type === 'bug' ? '#E64C35' : '#0C8CE9' }}>{e.type === 'bug' ? '🐞' : '▦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#000054', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
                  <div style={{ fontSize: 11.5, color: '#949DB2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.sub}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
