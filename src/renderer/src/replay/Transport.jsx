import { useState } from 'react'
import { SEVS } from '../lib/tokens.js'
import { fmt } from '../lib/format.js'

export default function Transport({ bugs, duration, t, activeId, onSeek, playing, onToggle, onPrev, onNext, activeIndex, total, onToggleFullscreen, isFullscreen }) {
  const [hover, setHover] = useState(null)
  const pct = (x) => (duration > 0 ? Math.min(100, Math.max(0, (x / duration) * 100)) : 0)
  const playLeft = `${pct(t)}%`

  // Thème : clair (vue normale) / sombre translucide (overlay plein écran).
  const C = isFullscreen
    ? { card: 'rgba(10,14,22,0.72)', border: 'rgba(255,255,255,0.10)', btn: '#cbd5e6', play: '#0C8CE9', idx: '#fff', idxSub: 'rgba(255,255,255,0.4)', sub: 'rgba(255,255,255,0.6)', track: 'rgba(255,255,255,0.18)', fill: '#0C8CE9', head: '#0C8CE9' }
    : { card: '#fff', border: '#E5E7EB', btn: '#595987', play: '#000054', idx: '#000054', idxSub: '#C0C3CE', sub: '#949DB2', track: '#EDEFF3', fill: '#000054', head: '#000054' }

  const round = { width: 36, height: 36, borderRadius: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.btn, cursor: 'pointer', fontSize: 14 }

  // Clic / glisser sur le track → cherche la position correspondante.
  const seekTo = (clientX, track) => {
    const r = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    onSeek(ratio * duration)
  }
  const onTrackDown = (e) => {
    const track = e.currentTarget
    seekTo(e.clientX, track)
    const move = (ev) => seekTo(ev.clientX, track)
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <div style={{ flex: 'none', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12, backdropFilter: isFullscreen ? 'blur(10px)' : undefined, WebkitBackdropFilter: isFullscreen ? 'blur(10px)' : undefined, boxShadow: isFullscreen ? '0 8px 30px rgba(0,0,0,0.45)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="hov-grey2" style={round} onClick={onPrev} title="Bug précédent (↑)">⏮</button>
        <button className="hov-navy" style={{ width: 46, height: 46, borderRadius: 100, background: C.play, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 }} onClick={onToggle}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button className="hov-grey2" style={round} onClick={onNext} title="Bug suivant (↓)">⏭</button>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.idx, fontVariantNumeric: 'tabular-nums', marginLeft: 4 }}>
          {activeIndex >= 0 ? activeIndex + 1 : '—'} <span style={{ color: C.idxSub, fontWeight: 500 }}>/ {total}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: C.sub }}>{fmt(t)} / {fmt(duration)} · ↑ ↓ chapitres · espace lecture</div>
          {onToggleFullscreen && (
            <button className="hov-grey2" style={round} onClick={onToggleFullscreen} title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'}>
              {isFullscreen ? '✕' : '⛶'}
            </button>
          )}
        </div>
      </div>

      <div onMouseDown={onTrackDown} style={{ position: 'relative', height: 40, padding: '14px 0', cursor: 'pointer' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 6, transform: 'translateY(-50%)', background: C.track, borderRadius: 100 }} />
        <div style={{ position: 'absolute', left: 0, top: '50%', height: 6, transform: 'translateY(-50%)', background: C.fill, borderRadius: 100, width: playLeft }} />
        {bugs.map((b) => (
          <button
            key={b.id}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onSeek(b.tc) }}
            onMouseEnter={() => setHover(b)}
            onMouseLeave={() => setHover(null)}
            title={`#${b.id} · ${fmt(b.tc)} · ${b.title}`}
            style={{ position: 'absolute', top: '50%', transform: `translate(-50%, -50%) scale(${b.id === activeId ? 1.35 : 1})`, width: 12, height: 12, borderRadius: 100, cursor: 'pointer', border: '2px solid #fff', boxShadow: b.id === activeId ? '0 0 0 3px rgba(0,0,84,0.18)' : '0 0 0 1px rgba(0,0,84,0.12)', background: SEVS[b.sev]?.color || '#949DB2', left: `${pct(b.tc)}%`, padding: 0 }}
          />
        ))}
        <div style={{ position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)', width: 16, height: 16, borderRadius: 100, background: '#fff', border: `3px solid ${C.head}`, boxShadow: '0 1px 4px rgba(0,0,84,0.3)', left: playLeft, pointerEvents: 'none' }} />
        {hover && (
          <div style={{ position: 'absolute', bottom: 34, left: `${pct(hover.tc)}%`, transform: 'translateX(-50%)', background: '#0a0e16', color: '#fff', fontSize: 12, padding: '6px 10px', borderRadius: 8, whiteSpace: 'nowrap', zIndex: 5, pointerEvents: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }}>
            <b style={{ color: '#7fb6ff' }}>#{hover.id}</b> · {fmt(hover.tc)} · {hover.title}
          </div>
        )}
      </div>
    </div>
  )
}
