import UserMenu from './UserMenu.jsx'

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

// Statut du modèle de transcription préchargé au démarrage.
function WhisperBadge({ whisper }) {
  const s = whisper?.state
  if (!s || s === 'idle') return null
  const conf = {
    loading: { label: 'Chargement du modèle…', icon: '⏳', fg: '#FFE2B0', bd: 'rgba(237,108,2,0.5)', bg: 'rgba(237,108,2,0.18)', tip: 'Chargement du modèle de transcription en mémoire…' },
    ready: { label: 'Modèle prêt', icon: '✓', fg: '#86E0AC', bd: 'rgba(71,179,117,0.5)', bg: 'rgba(71,179,117,0.18)', tip: 'Modèle de transcription chargé et résident.' },
    unavailable: { label: 'Modèle absent', icon: '⚠', fg: '#FFD9D2', bd: 'rgba(230,76,53,0.45)', bg: 'rgba(230,76,53,0.18)', tip: 'Transcription hors-ligne non embarquée (whisper.cpp). Fallback Python si disponible.' },
    error: { label: 'Modèle en erreur', icon: '⚠', fg: '#FFD9D2', bd: 'rgba(230,76,53,0.5)', bg: 'rgba(230,76,53,0.18)', tip: whisper?.reason || 'Erreur du serveur de transcription.' },
  }[s]
  if (!conf) return null
  return (
    <div title={conf.tip} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 28, padding: '0 12px', borderRadius: 100, background: conf.bg, border: `1px solid ${conf.bd}` }}>
      <span style={{ fontSize: 12, color: conf.fg, fontWeight: 800 }}>{conf.icon}</span>
      <span style={{ fontSize: 12, color: conf.fg, fontWeight: 600 }}>{conf.label}</span>
    </div>
  )
}

export default function TopBar({ gPct, gLabel, credits, whisper, onSearch, go, version, onOpenStorage }) {
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
        <WhisperBadge whisper={whisper} />
        <CreditBadge credits={credits} />
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.18)' }} />
        <div onClick={onSearch} title="Rechercher (Ctrl+K)" style={{ width: 34, height: 34, borderRadius: 100, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, cursor: 'pointer' }}>⌕</div>
        <UserMenu version={version} go={go} onOpenStorage={onOpenStorage} />
      </div>
    </div>
  )
}
