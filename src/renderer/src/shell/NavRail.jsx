const ITEMS = [
  { key: 'sessions', label: 'Sessions', glyph: '▦' },
  { key: 'record', label: 'Nouvelle session', glyph: '＋' },
  { key: 'settings', label: 'Réglages', glyph: '⚙' },
]

function fmtGo(bytes) {
  const go = (Number(bytes) || 0) / 1e9
  return go >= 10 ? go.toFixed(0) : go.toFixed(1)
}

export default function NavRail({ screen, go, storageDir, version, recording, storage, onOpenStorage }) {
  const used = storage?.usedBytes || 0
  const total = storage?.totalBytes || 0
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  return (
    <aside style={{ width: 230, flex: 'none', background: '#fff', borderRight: '1px solid #E5E7EB', padding: '14px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {ITEMS.map((item) => {
        const active = screen === item.key || (item.key === 'sessions' && screen === 'replay')
        const isRec = item.key === 'record' && recording
        const label = isRec ? 'Session en cours' : item.label
        return (
          <div
            key={item.key}
            className={active ? '' : 'hov-grey'}
            onClick={() => go(item.key)}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 14, background: isRec ? 'rgba(230,76,53,0.10)' : active ? '#F3F4F6' : 'transparent', color: isRec ? '#E64C35' : active ? '#000054' : '#595987', fontWeight: active || isRec ? 700 : 500 }}
          >
            <div style={{ position: 'absolute', left: 0, top: 11, width: 3, height: 20, borderRadius: 2, background: isRec ? '#E64C35' : '#000054', opacity: active || isRec ? 1 : 0 }} />
            {isRec
              ? <span style={{ width: 18, display: 'flex', justifyContent: 'center' }}><span style={{ width: 9, height: 9, borderRadius: 100, background: '#E64C35', animation: 'recblink 1.1s infinite' }} /></span>
              : <span style={{ fontSize: 16, width: 18, textAlign: 'center' }}>{item.glyph}</span>}
            <span>{label}</span>
          </div>
        )
      })}

      <div
        className="hov-grey"
        onClick={onOpenStorage}
        title="Ouvrir le dossier de stockage"
        style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, cursor: onOpenStorage ? 'pointer' : 'default' }}
      >
        <div style={{ height: 1, background: '#E5E7EB', marginBottom: 14 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#949DB2' }}>Stockage</div>
          <span style={{ fontSize: 12, color: '#949DB2' }}>↗</span>
        </div>
        <div style={{ fontSize: 12, color: '#595987', lineHeight: 1.6, wordBreak: 'break-all' }}>{storageDir || '—'}</div>
        <div style={{ height: 5, borderRadius: 100, background: '#F3F4F6', overflow: 'hidden', marginTop: 8 }}>
          <div style={{ height: '100%', width: total > 0 ? `${pct}%` : '0%', background: pct > 90 ? '#E64C35' : '#0C8CE9', borderRadius: 100 }} />
        </div>
        <div style={{ fontSize: 11, color: '#949DB2', marginTop: 6 }}>
          {total > 0 ? `${fmtGo(used)} Go utilisés sur ${fmtGo(total)} Go` : `${fmtGo(used)} Go utilisés`}
        </div>
      </div>

      <div style={{ marginTop: 'auto', padding: '12px 14px', fontSize: 11, color: '#C0C3CE' }}>v{version || '0.9.2'} · build interne</div>
    </aside>
  )
}
