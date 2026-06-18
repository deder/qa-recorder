const ITEMS = [
  { key: 'sessions', label: 'Sessions', glyph: '▦' },
  { key: 'record', label: 'Nouvelle session', glyph: '＋' },
  { key: 'settings', label: 'Réglages', glyph: '⚙' },
]

export default function NavRail({ screen, go, storageDir, version }) {
  return (
    <aside style={{ width: 230, flex: 'none', background: '#fff', borderRight: '1px solid #E5E7EB', padding: '14px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {ITEMS.map((item) => {
        const active = screen === item.key || (item.key === 'sessions' && screen === 'replay')
        return (
          <div
            key={item.key}
            className={active ? '' : 'hov-grey'}
            onClick={() => go(item.key)}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 14, background: active ? '#F3F4F6' : 'transparent', color: active ? '#000054' : '#595987', fontWeight: active ? 700 : 500 }}
          >
            <div style={{ position: 'absolute', left: 0, top: 11, width: 3, height: 20, borderRadius: 2, background: '#000054', opacity: active ? 1 : 0 }} />
            <span style={{ fontSize: 16, width: 18, textAlign: 'center' }}>{item.glyph}</span>
            <span>{item.label}</span>
          </div>
        )
      })}

      <div style={{ marginTop: 16, padding: '0 14px' }}>
        <div style={{ height: 1, background: '#E5E7EB', marginBottom: 14 }} />
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#949DB2', marginBottom: 10 }}>Stockage</div>
        <div style={{ fontSize: 12, color: '#595987', lineHeight: 1.6, wordBreak: 'break-all' }}>{storageDir || 'D:\\QA\\Sessions'}</div>
        <div style={{ height: 5, borderRadius: 100, background: '#F3F4F6', overflow: 'hidden', marginTop: 8 }}>
          <div style={{ height: '100%', width: '38%', background: '#0C8CE9', borderRadius: 100 }} />
        </div>
        <div style={{ fontSize: 11, color: '#949DB2', marginTop: 6 }}>34,2 Go utilisés sur 90 Go</div>
      </div>

      <div style={{ marginTop: 'auto', padding: '12px 14px', fontSize: 11, color: '#C0C3CE' }}>v{version || '0.9.2'} · build interne</div>
    </aside>
  )
}
