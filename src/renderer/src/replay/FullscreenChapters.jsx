import { useEffect, useRef } from 'react'
import { SEVS } from '../lib/tokens.js'
import { fmt } from '../lib/format.js'

// Liste de chapitres SIMPLE et SOMBRE, affichée à droite de la vidéo en plein écran.
// Volontairement épurée (pas de filtres/tri/catégories comme la vue normale) : on garde
// juste la pastille de sévérité, le timecode et le titre — cliquable pour se positionner.
export default function FullscreenChapters({ bugs, activeId, onSeek }) {
  const refs = useRef({})

  useEffect(() => {
    const el = refs.current[activeId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeId])

  return (
    <div style={{ width: 360, flex: 'none', background: '#0d1b2a', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flex: 'none', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#E8ECF4', fontSize: 14, fontWeight: 700 }}>
        Chapitres <span style={{ opacity: 0.45, fontWeight: 500 }}>· {bugs.length}</span>
      </div>
      <div className="qa-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {bugs.length === 0 && (
          <div style={{ color: 'rgba(232,236,244,0.5)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Aucun chapitre.</div>
        )}
        {bugs.map((b) => {
          const active = b.id === activeId
          return (
            <button
              key={b.id}
              ref={(el) => { refs.current[b.id] = el }}
              onClick={() => onSeek(b.tc)}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', width: '100%', background: active ? 'rgba(12,140,233,0.22)' : 'transparent', border: active ? '1px solid rgba(12,140,233,0.65)' : '1px solid transparent', color: '#E8ECF4' }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 100, flex: 'none', background: SEVS[b.sev]?.color || '#949DB2' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(232,236,244,0.55)', fontVariantNumeric: 'tabular-nums', flex: 'none' }}>{fmt(b.tc)}</span>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
