import { CATS } from '../lib/tokens.js'
import { fmt } from '../lib/format.js'

export default function VideoStage({ src, videoRef, onTime, onDuration, onToggle, onPlay, onPause, curBug, isFullscreen }) {
  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', borderRadius: isFullscreen ? 0 : 12, overflow: 'hidden', background: '#0d1b2a', border: isFullscreen ? 'none' : '1px solid #d9deea' }}>
      {src ? (
        <video
          ref={videoRef}
          src={src}
          onClick={onToggle}
          onPlay={onPlay}
          onPause={onPause}
          onTimeUpdate={(e) => onTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => onDuration(e.currentTarget.duration)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#0d1b2a', display: 'block', cursor: 'pointer' }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 14, flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 30 }}>⎚</div>
          Vidéo indisponible pour cette session
        </div>
      )}

      {curBug && (
        <div style={{ position: 'absolute', left: 16, bottom: 16, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(13,15,25,0.78)', padding: '9px 14px', borderRadius: 10, maxWidth: '80%', pointerEvents: 'none' }}>
          <span style={{ width: 8, height: 8, borderRadius: 100, flex: 'none', background: CATS[curBug.cat]?.color || '#0C8CE9' }} />
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700 }}>{fmt(curBug.tc)}</span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{curBug.title}</span>
        </div>
      )}
    </div>
  )
}
