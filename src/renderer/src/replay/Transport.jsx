import { useState } from 'react'
import { SEVS } from '../lib/tokens.js'
import { fmt } from '../lib/format.js'

export default function Transport({ bugs, duration, t, activeId, onSeek, playing, onToggle, onPrev, onNext, activeIndex, total }) {
  const [hover, setHover] = useState(null)
  const pct = (x) => (duration > 0 ? Math.min(100, Math.max(0, (x / duration) * 100)) : 0)
  const playLeft = `${pct(t)}%`

  const round = { width: 36, height: 36, borderRadius: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#595987', cursor: 'pointer', fontSize: 14 }

  return (
    <div style={{ flex: 'none', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="hov-grey2" style={round} onClick={onPrev} title="Bug précédent (↑)">⏮</button>
        <button className="hov-navy" style={{ width: 46, height: 46, borderRadius: 100, background: '#000054', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 }} onClick={onToggle}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button className="hov-grey2" style={round} onClick={onNext} title="Bug suivant (↓)">⏭</button>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#000054', fontVariantNumeric: 'tabular-nums', marginLeft: 4 }}>
          {activeIndex >= 0 ? activeIndex + 1 : '—'} <span style={{ color: '#C0C3CE', fontWeight: 500 }}>/ {total}</span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#949DB2' }}>{fmt(t)} / {fmt(duration)} · ↑ ↓ chapitres · espace lecture</div>
      </div>

      <div style={{ position: 'relative', height: 40, padding: '14px 0' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 6, transform: 'translateY(-50%)', background: '#EDEFF3', borderRadius: 100 }} />
        <div style={{ position: 'absolute', left: 0, top: '50%', height: 6, transform: 'translateY(-50%)', background: '#000054', borderRadius: 100, width: playLeft }} />
        {bugs.map((b) => (
          <button
            key={b.id}
            onClick={() => onSeek(b.tc)}
            onMouseEnter={() => setHover(b)}
            onMouseLeave={() => setHover(null)}
            title={`#${b.id} · ${fmt(b.tc)} · ${b.title}`}
            style={{ position: 'absolute', top: '50%', transform: `translate(-50%, -50%) scale(${b.id === activeId ? 1.35 : 1})`, width: 12, height: 12, borderRadius: 100, cursor: 'pointer', border: '2px solid #fff', boxShadow: b.id === activeId ? '0 0 0 3px rgba(0,0,84,0.18)' : '0 0 0 1px rgba(0,0,84,0.12)', background: SEVS[b.sev]?.color || '#949DB2', left: `${pct(b.tc)}%`, padding: 0 }}
          />
        ))}
        <div style={{ position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)', width: 16, height: 16, borderRadius: 100, background: '#fff', border: '3px solid #000054', boxShadow: '0 1px 4px rgba(0,0,84,0.3)', left: playLeft, pointerEvents: 'none' }} />
        {hover && (
          <div style={{ position: 'absolute', bottom: 34, left: `${pct(hover.tc)}%`, transform: 'translateX(-50%)', background: '#0a0e16', color: '#fff', fontSize: 12, padding: '6px 10px', borderRadius: 8, whiteSpace: 'nowrap', zIndex: 5, pointerEvents: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }}>
            <b style={{ color: '#7fb6ff' }}>#{hover.id}</b> · {fmt(hover.tc)} · {hover.title}
          </div>
        )}
      </div>
    </div>
  )
}
