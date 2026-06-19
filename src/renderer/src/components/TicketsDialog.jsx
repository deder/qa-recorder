import { useEffect, useMemo, useState } from 'react'

const api = window.api

// Périmètres d'envoi vers Notion.
const SCOPES = [
  { key: 'all', label: 'Tous les bugs', test: () => true },
  { key: 'open', label: 'Hors rejetés', test: (b) => b.status !== 'rejete' },
  { key: 'major', label: 'Bloquants & majeurs', test: (b) => b.sev === 'bloquant' || b.sev === 'majeur' },
]

export default function TicketsDialog({ open, bugs, onClose, onSend, onSent }) {
  const [scope, setScope] = useState('open')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null) // { done, total }
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (open) { setScope('open'); setBusy(false); setProgress(null); setResult(null) }
  }, [open])

  useEffect(() => {
    if (!busy) return
    const off = api.sessions.onNotionProgress((p) => setProgress({ done: p.done, total: p.total }))
    return off
  }, [busy])

  const rows = useMemo(() => SCOPES.map((sc) => {
    const sel = (bugs || []).filter(sc.test)
    const fresh = sel.filter((b) => !b.notionPageId)
    return { ...sc, total: sel.length, fresh: fresh.length, ids: sel.map((b) => b.id) }
  }), [bugs])

  if (!open) return null

  const current = rows.find((r) => r.key === scope) || rows[0]

  const send = async () => {
    setBusy(true)
    setProgress({ done: 0, total: current.fresh })
    try {
      const res = await onSend(current.ids)
      setResult(res)
      onSent?.()
    } catch (e) {
      setResult({ ok: false, error: String(e?.message || e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div onClick={busy ? undefined : onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,15,25,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: '90vw', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 24px 70px rgba(0,0,84,0.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, flex: 'none', borderRadius: 100, background: '#EEE5FF', color: '#8218E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>＋</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#000054' }}>Générer les tickets Notion</div>
        </div>

        {!result && (
          <>
            <div style={{ fontSize: 13.5, color: '#595987', lineHeight: 1.5 }}>Chaque bug devient une fiche dans « 🐛 QA Recette – Suivi des problèmes ». Les bugs déjà envoyés sont ignorés.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((r) => {
                const active = r.key === scope
                const skipped = r.total - r.fresh
                return (
                  <div key={r.key} onClick={() => !busy && setScope(r.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', border: active ? '2px solid #0C8CE9' : '1px solid #E0E0E0', borderRadius: 8, background: active ? '#F4FAFE' : '#fff', cursor: busy ? 'default' : 'pointer' }}>
                    <span style={{ width: 14, height: 14, flex: 'none', borderRadius: 100, border: active ? '4px solid #0C8CE9' : '1px solid #C0C3CE' }} />
                    <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 500, color: active ? '#0862A3' : '#595987' }}>{r.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#949DB2', fontWeight: 600 }}>{r.fresh} à envoyer{skipped ? ` · ${skipped} déjà fait${skipped > 1 ? 's' : ''}` : ''}</span>
                  </div>
                )
              })}
            </div>

            {busy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#0862A3', fontWeight: 600 }}>
                <span style={{ width: 18, height: 18, border: '3px solid #C9DCF2', borderTopColor: '#0C8CE9', borderRadius: 100, animation: 'spin 0.8s linear infinite' }} />
                Envoi vers Notion… {progress ? `${progress.done}/${progress.total}` : ''}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button className="hov-grey" disabled={busy} onClick={onClose} style={{ height: 40, padding: '0 18px', borderRadius: 8, border: '1px solid #E0E0E0', background: '#fff', color: '#000054', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1 }}>Annuler</button>
              <button className="hov-navy" disabled={busy || current.fresh === 0} onClick={send} style={{ height: 40, padding: '0 18px', borderRadius: 8, background: '#000054', color: '#fff', fontSize: 14, fontWeight: 600, cursor: busy || current.fresh === 0 ? 'default' : 'pointer', opacity: busy || current.fresh === 0 ? 0.5 : 1 }}>Envoyer {current.fresh} fiche{current.fresh > 1 ? 's' : ''}</button>
            </div>
          </>
        )}

        {result && (
          <>
            {result.ok && result.failed === 0 ? (
              <div style={{ fontSize: 13.5, color: '#317D51', lineHeight: 1.6 }}>
                ✅ {result.created} fiche{result.created > 1 ? 's' : ''} créée{result.created > 1 ? 's' : ''} dans Notion{result.skipped ? ` · ${result.skipped} déjà existante(s)` : ''}.
              </div>
            ) : (
              <div style={{ fontSize: 13.5, color: '#A13525', lineHeight: 1.6 }}>
                {result.created ? `✅ ${result.created} créée(s). ` : ''}{result.failed ? `⚠ ${result.failed} en échec. ` : ''}<br />
                {result.error || 'Vérifiez le token et le partage de la base avec l’intégration (Réglages).'}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="hov-navy" onClick={onClose} style={{ height: 40, padding: '0 18px', borderRadius: 8, background: '#000054', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Fermer</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
