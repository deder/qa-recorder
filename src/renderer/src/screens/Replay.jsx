import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import VideoStage from '../replay/VideoStage.jsx'
import Transport from '../replay/Transport.jsx'
import BugPanel from '../replay/BugPanel.jsx'
import TicketsDialog from '../components/TicketsDialog.jsx'
import { useKeyboardNav } from '../lib/useKeyboardNav.js'
import { SEVS, STATUS_ORDER, FIXED_STATUSES } from '../lib/tokens.js'
import { fmt } from '../lib/format.js'
import { bugsToMarkdown } from '../lib/ticketFormat.js'

const api = window.api

export default function Replay({ sessionId, onBack }) {
  const [meta, setMeta] = useState(null)
  const [bugs, setBugs] = useState([])
  const [hasVideo, setHasVideo] = useState(false)
  const [t, setT] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [q, setQ] = useState('')
  const [sortMode, setSortMode] = useState('tc')
  const [catSet, setCatSet] = useState(() => new Set())
  const [sevSet, setSevSet] = useState(() => new Set())
  const [ticketsOpen, setTicketsOpen] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')
  const videoRef = useRef(null)

  useEffect(() => {
    let alive = true
    api.sessions.load(sessionId).then((res) => {
      if (!alive || !res) return
      setMeta(res.meta)
      setBugs((res.bugs || []).slice().sort((a, b) => a.tc - b.tc))
      setHasVideo(res.hasVideo)
      setT(0)
      setPlaying(false)
    })
    return () => { alive = false }
  }, [sessionId])

  // Recharge uniquement les bugs (après envoi Notion : récupère notionUrl).
  const reloadBugs = useCallback(() => {
    api.sessions.load(sessionId).then((res) => {
      if (res) setBugs((res.bugs || []).slice().sort((a, b) => a.tc - b.tc))
    })
  }, [sessionId])

  const exportPdf = useCallback(async () => {
    setPdfBusy(true)
    try { await api.sessions.exportPdf(sessionId) } finally { setPdfBusy(false) }
  }, [sessionId])

  const sendToNotion = useCallback((bugIds) => api.sessions.pushToNotion(sessionId, bugIds), [sessionId])

  const openNotion = useCallback((url) => { if (url) api.system.openExternal(url) }, [])

  // Ordre chronologique (navigation, marqueurs, bug actif)
  const chrono = useMemo(() => bugs.slice().sort((a, b) => a.tc - b.tc), [bugs])

  const activeId = useMemo(() => {
    let id = null
    for (const b of chrono) {
      if (b.tc <= t + 0.25) id = b.id
      else break
    }
    return id
  }, [chrono, t])

  const activeIndex = useMemo(() => chrono.findIndex((b) => b.id === activeId), [chrono, activeId])
  const activeBug = activeIndex >= 0 ? chrono[activeIndex] : null

  const catCounts = useMemo(() => {
    const m = {}
    for (const b of bugs) m[b.cat] = (m[b.cat] || 0) + 1
    return m
  }, [bugs])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    let arr = bugs.filter((b) => {
      if (catSet.size && !catSet.has(b.cat)) return false
      if (sevSet.size && !sevSet.has(b.sev)) return false
      if (query && !`${b.title} ${b.desc} ${fmt(b.tc)}`.toLowerCase().includes(query)) return false
      return true
    })
    if (sortMode === 'sev') arr = arr.slice().sort((a, b) => (SEVS[b.sev].rank - SEVS[a.sev].rank) || a.tc - b.tc)
    else arr = arr.slice().sort((a, b) => a.tc - b.tc)
    return arr
  }, [bugs, q, catSet, sevSet, sortMode])

  const seek = useCallback((sec) => {
    const el = videoRef.current
    if (!el) { setT(sec); return }
    el.currentTime = sec
    el.play().catch(() => {})
  }, [])

  const togglePlay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    el.paused ? el.play().catch(() => {}) : el.pause()
  }, [])

  const prevBug = useCallback(() => {
    const i = activeIndex < 0 ? 0 : Math.max(0, activeIndex - 1)
    if (chrono[i]) seek(chrono[i].tc)
  }, [activeIndex, chrono, seek])

  const nextBug = useCallback(() => {
    const i = activeIndex < 0 ? 0 : Math.min(chrono.length - 1, activeIndex + 1)
    if (chrono[i]) seek(chrono[i].tc)
  }, [activeIndex, chrono, seek])

  useKeyboardNav({ onPrev: prevBug, onNext: nextBug, onTogglePlay: togglePlay })

  const cycleStatus = useCallback((bug) => {
    setBugs((prev) => {
      const next = prev.map((b) => {
        if (b.id !== bug.id) return b
        const i = STATUS_ORDER.indexOf(b.status)
        return { ...b, status: STATUS_ORDER[(i + 1) % STATUS_ORDER.length] }
      })
      api.sessions.saveBugs(sessionId, next)
      return next
    })
  }, [sessionId])

  const toggle = (setFn) => (key) => setFn((prev) => {
    const n = new Set(prev)
    n.has(key) ? n.delete(key) : n.add(key)
    return n
  })

  const fixed = bugs.filter((b) => FIXED_STATUSES.includes(b.status)).length
  const fixedPct = bugs.length ? Math.round((fixed / bugs.length) * 100) : 0

  const copyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bugsToMarkdown(meta, chrono))
      setCopyMsg('Copié ✓')
      setTimeout(() => setCopyMsg(''), 1600)
    } catch { setCopyMsg('Échec copie') }
  }, [meta, chrono])

  const btn = (bg, color, border) => ({ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px', borderRadius: 8, background: bg, color, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: border ? `1px solid ${border}` : 'none' })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', borderBottom: '1px solid #E5E7EB', background: '#fff' }}>
        <button className="hov-grey" style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#595987', cursor: 'pointer', fontSize: 16, background: '#fff' }} onClick={onBack}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#000054', lineHeight: 1.2 }}>{meta?.name || 'Session'}</div>
          <div style={{ fontSize: 12, color: '#595987' }}>{meta?.date} · {bugs.length} bugs · {filtered.length} affichés</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#595987', fontWeight: 500 }}>{fixed}/{bugs.length} corrigés</div>
          <div style={{ width: 90, height: 6, borderRadius: 100, background: '#F3F4F6', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#47B375', borderRadius: 100, width: `${fixedPct}%` }} />
          </div>
        </div>
        <div style={{ width: 1, height: 26, background: '#E5E7EB' }} />
        <button className="hov-grey" style={btn('#fff', '#000054', '#E0E0E0')} onClick={copyMarkdown} disabled={!bugs.length} title="Copier les bugs au format Markdown">⧉ {copyMsg || 'Markdown'}</button>
        <button className="hov-grey" style={btn('#fff', '#000054', '#E0E0E0')} onClick={exportPdf} disabled={pdfBusy || !bugs.length} title="Exporter un rapport PDF de la session">{pdfBusy ? '⏳ Génération…' : '↧ Export PDF'}</button>
        <button className="hov-navy" style={btn('#000054', '#fff')} onClick={() => setTicketsOpen(true)} disabled={!bugs.length} title="Créer des fiches dans Notion">＋ Générer les tickets</button>
      </div>

      {/* body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#F4F6FA', padding: 20, gap: 14 }}>
          <VideoStage
            src={hasVideo ? api.mediaUrl(sessionId) : null}
            videoRef={videoRef}
            onTime={setT}
            onDuration={setDuration}
            onToggle={togglePlay}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            curBug={activeBug}
          />
          <Transport
            bugs={chrono}
            duration={duration}
            t={t}
            activeId={activeId}
            onSeek={seek}
            playing={playing}
            onToggle={togglePlay}
            onPrev={prevBug}
            onNext={nextBug}
            activeIndex={activeIndex}
            total={bugs.length}
          />
        </div>

        <BugPanel
          filtered={filtered}
          q={q}
          setQ={setQ}
          sortMode={sortMode}
          setSort={setSortMode}
          catSet={catSet}
          toggleCat={toggle(setCatSet)}
          sevSet={sevSet}
          toggleSev={toggle(setSevSet)}
          activeId={activeId}
          onSeek={seek}
          onCycleStatus={cycleStatus}
          onOpenNotion={openNotion}
          catCounts={catCounts}
        />
      </div>

      <TicketsDialog
        open={ticketsOpen}
        bugs={bugs}
        onClose={() => setTicketsOpen(false)}
        onSend={sendToNotion}
        onSent={reloadBugs}
      />
    </div>
  )
}
