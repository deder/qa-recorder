function CreditBadge({ credits }) {
  if (!credits) return null
  if (credits.error) {
    return (
      <div title={`OpenRouter : ${credits.error}`} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 12px', borderRadius: 100, background: 'rgba(230,76,53,0.18)', border: '1px solid rgba(230,76,53,0.45)', color: '#FFD9D2', fontSize: 12, fontWeight: 600 }}>
        ⚠ OpenRouter
      </div>
    )
  }
  if (typeof credits.remaining !== 'number') return null
  const low = credits.remaining < 1
  return (
    <div title={`Crédit OpenRouter restant — utilisé : $${(credits.usage || 0).toFixed(2)} / $${(credits.total || 0).toFixed(2)}`} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 28, padding: '0 12px', borderRadius: 100, background: low ? 'rgba(230,76,53,0.18)' : 'rgba(71,179,117,0.18)', border: `1px solid ${low ? 'rgba(230,76,53,0.5)' : 'rgba(71,179,117,0.5)'}` }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>OpenRouter</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: low ? '#FF9B8C' : '#86E0AC', fontVariantNumeric: 'tabular-nums' }}>${credits.remaining.toFixed(2)}</span>
    </div>
  )
}

export default function TopBar({ gPct, gLabel, credits }) {
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
        <CreditBadge credits={credits} />
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.18)' }} />
        <div style={{ width: 34, height: 34, borderRadius: 100, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15 }}>⌕</div>
        <div style={{ width: 34, height: 34, borderRadius: 100, background: '#0C8CE9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>RM</div>
      </div>
    </div>
  )
}
