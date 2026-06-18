import { useEffect, useRef } from 'react'
import { CATS, CAT_ORDER, SEVS, SEV_ORDER, STATUSES } from '../lib/tokens.js'
import { fmt } from '../lib/format.js'

export default function BugPanel({ filtered, q, setQ, sortMode, setSort, catSet, toggleCat, sevSet, toggleSev, activeId, onSeek, onCycleStatus, catCounts }) {
  const listRef = useRef(null)
  const cardRefs = useRef({})

  useEffect(() => {
    const el = cardRefs.current[activeId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeId])

  const sortBtn = (mode, label) => {
    const on = sortMode === mode
    return (
      <button onClick={() => setSort(mode)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: on ? '#000054' : 'transparent', color: on ? '#fff' : '#595987' }}>
        {label}
      </button>
    )
  }

  return (
    <div style={{ width: 414, flex: 'none', borderLeft: '1px solid #E5E7EB', background: '#fff', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* filters */}
      <div style={{ flex: 'none', padding: '14px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, background: '#FAFBFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 12px' }}>
          <span style={{ color: '#949DB2', fontSize: 14 }}>⌕</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer les bugs…" style={{ border: 'none', outline: 'none', flex: 1, fontFamily: 'Mulish', fontSize: 13, color: '#000054', background: 'transparent' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#595987' }}>Trier par</div>
          <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 3, gap: 2 }}>
            {sortBtn('tc', 'Timecode')}
            {sortBtn('sev', 'Sévérité')}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CAT_ORDER.map((key) => {
            const c = CATS[key]
            const on = catSet.has(key)
            return (
              <button key={key} onClick={() => toggleCat(key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: on ? c.bg : '#fff', color: on ? c.color : '#595987', border: `1px solid ${on ? c.color : '#E5E7EB'}` }}>
                <span style={{ width: 7, height: 7, borderRadius: 100, background: c.color }} />
                {c.label} <span style={{ opacity: 0.6 }}>{catCounts[key] || 0}</span>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {SEV_ORDER.map((key) => {
            const s = SEVS[key]
            const on = sevSet.has(key)
            return (
              <button key={key} onClick={() => toggleSev(key)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '5px 8px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: on ? s.bg : '#fff', color: on ? s.color : '#595987', border: `1px solid ${on ? s.color : '#E5E7EB'}` }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color }} />
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* list */}
      <div ref={listRef} className="qa-scroll" style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ color: '#949DB2', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Aucun bug ne correspond aux filtres.</div>
        )}
        {filtered.map((b) => {
          const cat = CATS[b.cat] || CATS.affichage
          const sev = SEVS[b.sev] || SEVS.mineur
          const st = STATUSES[b.status] || STATUSES['a-corriger']
          const active = b.id === activeId
          return (
            <div
              key={b.id}
              ref={(el) => { cardRefs.current[b.id] = el }}
              onClick={() => onSeek(b.tc)}
              style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 9, padding: '13px 14px 13px 16px', borderRadius: 10, cursor: 'pointer', background: active ? '#EAF4FD' : '#fff', border: `1px solid ${active ? '#0C8CE9' : '#E5E7EB'}`, transition: 'background 150ms' }}
            >
              <div style={{ position: 'absolute', left: 0, top: 13, bottom: 13, width: 3, borderRadius: 2, background: '#0C8CE9', opacity: active ? 1 : 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 22, height: 22, flex: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: active ? '#0C8CE9' : '#F3F4F6', color: active ? '#fff' : '#595987' }}>{b.id}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#595987', fontVariantNumeric: 'tabular-nums' }}>{fmt(b.tc)}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: sev.bg, color: sev.color }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: sev.color }} />{sev.label}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#000054', lineHeight: 1.3 }}>{b.title}</div>
              <div style={{ fontSize: 12.5, color: '#595987', lineHeight: 1.45 }}>{b.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: cat.bg, color: cat.color }}>
                  <span style={{ width: 6, height: 6, borderRadius: 100, background: cat.color }} />{cat.label}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onCycleStatus(b) }}
                  title="Cliquer pour changer le statut"
                  style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: st.bg, color: st.color }}
                >
                  {st.label} ▾
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
