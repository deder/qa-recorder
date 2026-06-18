export default function TopBar({ gPct, gLabel }) {
  return (
    <div style={{ height: 56, flex: 'none', background: '#000054', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fff', color: '#000054', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>QA</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Session Recorder</div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.4px', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 100, padding: '2px 8px' }}>AllManager QA</div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Avancement global</div>
          <div style={{ width: 130, height: 6, borderRadius: 100, background: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 100, background: '#47B375', width: gPct }} />
          </div>
          <div style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{gLabel}</div>
        </div>
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.18)' }} />
        <div style={{ width: 34, height: 34, borderRadius: 100, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15 }}>⌕</div>
        <div style={{ width: 34, height: 34, borderRadius: 100, background: '#0C8CE9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>RM</div>
      </div>
    </div>
  )
}
