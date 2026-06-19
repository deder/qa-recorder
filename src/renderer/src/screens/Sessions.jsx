import { useMemo, useState } from 'react'
import { fmt } from '../lib/format.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

const SHORT_STEPS = ['Finalisation', 'Conversion', 'Transcription', 'Analyse']

function Poster({ s }) {
  const hue = s.hue || '#0C8CE9'
  const ready = s.status === 'PRETE'
  const proc = s.status === 'PROCESSING'
  const err = s.status === 'ERREUR'
  return (
    <div style={{ position: 'relative', height: 132, background: '#F4F6FA', borderBottom: '1px solid #E5E7EB', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: ready ? 1 : 0.4 }}>
        <div style={{ height: 18, background: hue }} />
        <div style={{ display: 'flex', height: 'calc(100% - 18px)' }}>
          <div style={{ width: 34, background: hue + '22', borderRight: '1px solid rgba(255,255,255,0.6)' }} />
          <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ height: 9, width: '55%', borderRadius: 3, background: hue + '22' }} />
            <div style={{ display: 'flex', gap: 7 }}>
              <div style={{ flex: 1, height: 26, borderRadius: 4, background: '#fff', border: '1px solid #E9ECF2' }} />
              <div style={{ flex: 1, height: 26, borderRadius: 4, background: '#fff', border: '1px solid #E9ECF2' }} />
            </div>
            <div style={{ height: 7, width: '80%', borderRadius: 3, background: '#E9ECF2' }} />
            <div style={{ height: 7, width: '65%', borderRadius: 3, background: '#E9ECF2' }} />
          </div>
        </div>
      </div>

      {ready && (
        <>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: 100, background: 'rgba(0,0,84,0.82)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, paddingLeft: 4 }}>▶</div>
          </div>
          <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,30,0.78)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 7px', borderRadius: 4 }}>{fmt(s.durationSec || 0)}</div>
        </>
      )}

      {proc && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,251,251,0.86)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#595987', fontSize: 12, fontWeight: 600 }}>
            <div style={{ width: 14, height: 14, border: '2px solid #C9CEDB', borderTopColor: '#0C8CE9', borderRadius: 100, animation: 'spin 0.8s linear infinite' }} />
            {SHORT_STEPS[s.procStep || 0]} · {s.procPct || 0}%
          </div>
          <div style={{ width: '100%', height: 6, borderRadius: 100, background: '#E9ECF2', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 100, background: '#0C8CE9', width: `${s.procPct || 0}%` }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#949DB2' }}>🔒 Session verrouillée</div>
        </div>
      )}

      {err && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(253,236,234,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#A13525', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>⚠ Échec · {SHORT_STEPS[s.procStep || 0]}</div>
        </div>
      )}

      {s.status === 'RECORDING' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,15,25,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 12, fontWeight: 700 }}>
            <span style={{ width: 9, height: 9, borderRadius: 100, background: '#E64C35', animation: 'recblink 1.1s infinite' }} />Enregistrement en cours
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Cliquer pour revenir à l’enregistrement</div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    PRETE: { t: 'Prête', c: '#317D51', bg: '#E8F5EC' },
    PROCESSING: { t: 'Traitement', c: '#0862A3', bg: '#E5F2FD' },
    ERREUR: { t: 'Erreur', c: '#A13525', bg: '#FBEAE7' },
    RECORDING: { t: 'Enregistrement', c: '#A13525', bg: '#FBEAE7' },
  }
  const v = map[status] || map.PRETE
  return <span style={{ fontSize: 11, fontWeight: 600, color: v.c, background: v.bg, padding: '3px 8px', borderRadius: 100, whiteSpace: 'nowrap' }}>{v.t}</span>
}

function TrashButton({ onClick }) {
  return (
    <button onClick={onClick} title="Supprimer la session" className="hov-grey2" style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A13525', background: 'transparent', cursor: 'pointer', fontSize: 14, flex: 'none' }}>🗑</button>
  )
}

function SeverityBars({ stats }) {
  const total = stats.bugs || 1
  const segs = [
    { c: '#E64C35', n: stats.bloquant },
    { c: '#ED6C02', n: stats.majeur },
    { c: '#949DB2', n: stats.mineur },
  ]
  return (
    <div style={{ display: 'flex', height: 6, borderRadius: 100, overflow: 'hidden', background: '#F3F4F6' }}>
      {segs.map((s, i) => (s.n ? <div key={i} style={{ height: '100%', width: `${(s.n / total) * 100}%`, background: s.c }} /> : null))}
    </div>
  )
}

export default function Sessions({ sessions, view, setView, global, onOpen, onNew, onRelaunch, onDelete, onImport }) {
  const [q, setQ] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const askDelete = (s) => setToDelete(s)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return sessions
    return sessions.filter((s) => `${s.name} ${s.date}`.toLowerCase().includes(query))
  }, [sessions, q])

  const kpiCard = (accent, label, value, sub, valueColor) => (
    <div style={{ position: 'relative', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px 20px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 3, borderRadius: 2, background: accent }} />
      <div style={{ fontSize: 13, color: '#595987', fontWeight: 500, marginTop: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: valueColor || '#000054', lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      {sub}
    </div>
  )

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#000054', margin: 0 }}>Sessions QA</h1>
          <div style={{ fontSize: 14, color: '#595987', marginTop: 4 }}>{global.count} sessions · {global.processing} en traitement</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: 3, gap: 2 }}>
            <button onClick={() => setView('cards')} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: view === 'cards' ? '#000054' : 'transparent', color: view === 'cards' ? '#fff' : '#595987' }}>▦ Cartes</button>
            <button onClick={() => setView('table')} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: view === 'table' ? '#000054' : 'transparent', color: view === 'table' ? '#fff' : '#595987' }}>≣ Tableau</button>
          </div>
          <button className="hov-navy" onClick={onNew} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 18px', borderRadius: 8, background: '#000054', color: '#fff', fontSize: 14, fontWeight: 600, letterSpacing: '0.4px', cursor: 'pointer' }}>
            <span style={{ fontSize: 17, lineHeight: 1 }}>＋</span> Nouvelle session
          </button>
          <div style={{ position: 'relative' }}>
            <button className="hov-grey" onClick={() => setMenuOpen((o) => !o)} title="Plus d’options" style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#595987', fontSize: 20, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}>⋯</button>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                <div style={{ position: 'absolute', right: 0, top: 46, zIndex: 51, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 12px 30px rgba(0,0,84,0.16)', padding: 6, minWidth: 260 }}>
                  <button className="hov-grey" onClick={() => { setMenuOpen(false); onImport?.() }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, background: 'transparent', color: '#000054', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <span style={{ fontSize: 15 }}>⬆</span> Importer une vidéo (MKV / MP4)…
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {kpiCard('#000054', 'Sessions enregistrées', global.count, <div style={{ fontSize: 12, color: '#595987', marginTop: 2 }}>{global.processing} en traitement</div>)}
        {kpiCard('#0C8CE9', 'Bugs détectés', global.totalBugs, <div style={{ fontSize: 12, color: '#595987', marginTop: 2 }}>sur l’ensemble des sessions prêtes</div>)}
        {kpiCard('#47B375', 'Bugs corrigés', global.totalFixed, (
          <div style={{ height: 6, borderRadius: 100, background: '#F3F4F6', overflow: 'hidden', marginTop: 8 }}>
            <div style={{ height: '100%', borderRadius: 100, background: '#47B375', width: `${global.gPct}%` }} />
          </div>
        ))}
        {kpiCard('#E64C35', 'Bloquants ouverts', global.bloOpen, <div style={{ fontSize: 12, color: '#595987', marginTop: 2 }}>à traiter en priorité</div>, '#E64C35')}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, height: 42, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 14px' }}>
        <span style={{ color: '#949DB2', fontSize: 15 }}>⌕</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une session…" style={{ border: 'none', outline: 'none', flex: 1, fontFamily: 'Mulish', fontSize: 14, color: '#000054', background: 'transparent' }} />
      </div>

      {view === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 18 }}>
          {filtered.map((s) => {
            const ready = s.status === 'PRETE'
            const err = s.status === 'ERREUR'
            const clickable = ready || s.status === 'RECORDING'
            return (
              <div key={s.id} className={clickable ? 'card-hov' : ''} onClick={() => clickable && onOpen(s)} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', cursor: clickable ? 'pointer' : 'default' }}>
                <Poster s={s} />
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#000054', lineHeight: 1.3 }}>{s.name}</div>
                    <StatusBadge status={s.status} />
                    <TrashButton onClick={(e) => { e.stopPropagation(); askDelete(s) }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#595987' }}>
                    <span>{s.date}</span><span style={{ color: '#D4D7E0' }}>·</span>
                    <span>{ready && s.stats ? `${s.stats.bugs} bugs` : err ? 'échec du traitement' : 'en cours…'}</span>
                  </div>
                  {ready && s.stats && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <SeverityBars stats={s.stats} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 12, color: '#595987', fontWeight: 500 }}>{s.stats.fixed}/{s.stats.bugs} corrigés</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#317D51' }}>{s.stats.bugs ? Math.round((s.stats.fixed / s.stats.bugs) * 100) : 0}%</div>
                      </div>
                    </div>
                  )}
                  {err && (
                    <button className="hov-red" onClick={(e) => { e.stopPropagation(); onRelaunch(s.id) }} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 8, background: '#E64C35', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>↻ Relancer</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.7fr 0.7fr 0.7fr 1.3fr 1fr', padding: '12px 18px', background: '#FAFBFB', borderBottom: '1px solid #E5E7EB', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#595987' }}>
            <div>Session</div><div>Date</div><div>Durée</div><div>Bugs</div><div>Sévérité</div><div>Statut</div>
          </div>
          {filtered.map((s) => {
            const ready = s.status === 'PRETE'
            const clickable = ready || s.status === 'RECORDING'
            return (
              <div key={s.id} className={clickable ? 'row-hov' : ''} onClick={() => clickable && onOpen(s)} style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.7fr 0.7fr 0.7fr 1.3fr 1fr', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid #F0F1F4', fontSize: 13, color: '#000054', cursor: clickable ? 'pointer' : 'default' }}>
                <div style={{ fontWeight: 600, paddingRight: 12 }}>{s.name}</div>
                <div style={{ color: '#595987' }}>{s.date}</div>
                <div style={{ color: '#595987' }}>{ready ? fmt(s.durationSec || 0) : '—'}</div>
                <div style={{ color: '#595987', fontWeight: 600 }}>{ready && s.stats ? s.stats.bugs : '—'}</div>
                <div>{ready && s.stats ? <div style={{ width: 110 }}><SeverityBars stats={s.stats} /></div> : <span style={{ color: '#C0C3CE' }}>—</span>}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <StatusBadge status={s.status} />
                  <TrashButton onClick={(e) => { e.stopPropagation(); askDelete(s) }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Supprimer la session"
        message={toDelete ? `« ${toDelete.name} »\nCette action est irréversible.` : ''}
        confirmLabel="Supprimer"
        onConfirm={() => { onDelete(toDelete.id); setToDelete(null) }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
