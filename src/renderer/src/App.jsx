import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { startWindowCapture } from './lib/windowRecorder.js'
import TitleBar from './shell/TitleBar.jsx'
import TopBar from './shell/TopBar.jsx'
import NavRail from './shell/NavRail.jsx'
import Sessions from './screens/Sessions.jsx'
import Record from './screens/Record.jsx'
import Processing from './screens/Processing.jsx'
import Replay from './screens/Replay.jsx'
import Settings from './screens/Settings.jsx'
import SearchPalette from './components/SearchPalette.jsx'

const api = window.api

export default function App() {
  const [screen, setScreen] = useState('sessions')
  const [view, setView] = useState('cards')
  const [selectedId, setSelectedId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [settings, setSettings] = useState(null)
  const [version, setVersion] = useState('0.9.2')
  const [credits, setCredits] = useState(null)
  const [importing, setImporting] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [storage, setStorage] = useState(null)
  const [whisper, setWhisper] = useState({ state: 'idle' })
  // État d'enregistrement GLOBAL (persiste quand on change d'écran)
  const [rec, setRec] = useState({ active: false, state: 'idle', sessionId: null, elapsed: 0 })

  const refreshSessions = useCallback(async () => {
    setSessions(await api.sessions.list())
  }, [])

  const refreshStorage = useCallback(() => {
    api.system.storageUsage().then(setStorage).catch(() => {})
  }, [])

  const refreshCredits = useCallback(() => {
    api.settings.openrouterCredits().then(setCredits).catch(() => {})
  }, [])

  useEffect(() => {
    refreshSessions()
    refreshStorage()
    api.settings.get().then(setSettings)
    api.system.version().then(setVersion)
  }, [refreshSessions, refreshStorage])

  // Statut du modèle de transcription (préchargé au démarrage) : état initial + flux d'événements.
  useEffect(() => {
    api.whisper.status().then(setWhisper).catch(() => {})
    return api.whisper.onStatus(setWhisper)
  }, [])

  // Raccourci Ctrl/Cmd+K → recherche globale.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    refreshCredits()
    const t = setInterval(refreshCredits, 60000)
    return () => clearInterval(t)
  }, [refreshCredits])

  // Suivi GLOBAL du traitement : la liste des sessions se met à jour en direct,
  // même hors de l'écran "Traitement en cours" (le pipeline tourne dans le main).
  useEffect(() => {
    const off = api.sessions.onProgress((p) => {
      setSessions((prev) => prev.map((s) => (s.id === p.id ? { ...s, status: p.status, procStep: p.step, procPct: p.pct } : s)))
      if (p.done || p.status === 'PRETE' || p.status === 'ERREUR') refreshSessions()
    })
    return off
  }, [refreshSessions])

  // Arrêt automatique de l'enregistrement (ex. fenêtre capturée fermée) :
  // le main a déjà lancé le pipeline → on bascule sur l'écran Traitement.
  useEffect(() => {
    const off = api.recording.onAutoStopped(({ id }) => {
      setRec({ active: false, state: 'idle', sessionId: null, elapsed: 0 })
      if (id) { setSelectedId(id); setScreen('processing') }
    })
    return off
  }, [])

  // Chrono d'enregistrement (continue même hors de l'écran d'enregistrement)
  useEffect(() => {
    if (rec.state !== 'recording') return
    const t = setInterval(() => setRec((r) => ({ ...r, elapsed: r.elapsed + 1 })), 1000)
    return () => clearInterval(t)
  }, [rec.state])

  // Contrôleur de capture native (mode fenêtre) ; null en mode écran (ffmpeg).
  const winRecRef = useRef(null)

  const startRec = useCallback(async (opts) => {
    const id = await api.recording.start(opts)
    if (opts.sourceType === 'window') {
      try {
        winRecRef.current = await startWindowCapture({
          id,
          sourceId: opts.sourceId,
          micDeviceId: opts.micDeviceId,
          // Fenêtre fermée pendant l'enregistrement → arrêt auto + traitement.
          onEnded: async () => {
            const ctrl = winRecRef.current
            if (!ctrl) return
            winRecRef.current = null
            try { await ctrl.stop() } catch { /* noop */ }
            setRec({ active: false, state: 'idle', sessionId: null, elapsed: 0 })
            setSelectedId(id)
            setScreen('processing')
          },
        })
      } catch (e) {
        await api.recording.windowAbort(id).catch(() => {})
        throw e // remonte à Record.jsx (le bouton se réactive)
      }
    }
    setRec({ active: true, state: 'recording', sessionId: id, elapsed: 0 })
  }, [])

  const pauseRec = useCallback(async () => {
    if (winRecRef.current) winRecRef.current.pause()
    else await api.recording.pause()
    setRec((r) => ({ ...r, state: 'paused' }))
  }, [])

  const resumeRec = useCallback(async () => {
    if (winRecRef.current) winRecRef.current.resume()
    else await api.recording.resume()
    setRec((r) => ({ ...r, state: 'recording' }))
  }, [])

  const stopRec = useCallback(async () => {
    let sid = rec.sessionId
    if (winRecRef.current) {
      const ctrl = winRecRef.current
      winRecRef.current = null
      await ctrl.stop() // streame le reste + déclenche le pipeline (recording:window-stop)
    } else {
      const id = await api.recording.stop()
      sid = id || rec.sessionId
    }
    setRec({ active: false, state: 'idle', sessionId: null, elapsed: 0 })
    if (sid) { setSelectedId(sid); setScreen('processing') }
  }, [rec.sessionId])

  const global = useMemo(() => {
    const ready = sessions.filter((s) => s.status === 'PRETE' && s.stats)
    const totalBugs = ready.reduce((a, s) => a + s.stats.bugs, 0)
    const totalFixed = ready.reduce((a, s) => a + s.stats.fixed, 0)
    const bloOpen = ready.reduce((a, s) => a + s.stats.bloOpen, 0)
    const gPct = totalBugs ? Math.round((totalFixed / totalBugs) * 100) : 0
    const processing = sessions.filter((s) => s.status === 'PROCESSING').length
    return { count: sessions.length, processing, totalBugs, totalFixed, bloOpen, gPct }
  }, [sessions])

  const go = useCallback((s) => {
    if (s === 'sessions') refreshSessions()
    setScreen(s)
  }, [refreshSessions])

  const openSession = useCallback((s) => {
    setSelectedId(s.id)
    if (s.status === 'PRETE') setScreen('replay')
    else if (s.status === 'RECORDING') setScreen('record')
    else setScreen('processing')
  }, [])

  // Résultat de recherche globale → ouvre la session concernée.
  const openSearchResult = useCallback((e) => {
    const s = sessions.find((x) => x.id === e.sessionId)
    if (s) openSession(s)
    else { setSelectedId(e.sessionId); setScreen('replay') }
  }, [sessions, openSession])

  const openStorage = useCallback(() => { api.system.openStorage() }, [])

  const backToList = useCallback(() => {
    refreshSessions()
    setScreen('sessions')
  }, [refreshSessions])

  const goProcessing = useCallback((id) => {
    setSelectedId(id)
    setScreen('processing')
  }, [])

  const deleteSession = useCallback(async (id) => {
    await api.sessions.remove(id)
    if (rec.sessionId === id) setRec({ active: false, state: 'idle', sessionId: null, elapsed: 0 })
    refreshSessions()
    refreshStorage()
  }, [rec.sessionId, refreshSessions, refreshStorage])

  const importVideo = useCallback(async () => {
    setImporting(true)
    try {
      const id = await api.sessions.import()
      if (id) { setSelectedId(id); setScreen('processing') }
    } finally {
      setImporting(false)
    }
  }, [])

  const replayMode = screen === 'replay'

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      <TitleBar />
      <TopBar gPct={`${global.gPct}%`} gLabel={`${global.gPct}%`} credits={credits} whisper={whisper} onSearch={() => setSearchOpen(true)} go={go} version={version} onOpenStorage={openStorage} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <NavRail screen={screen} go={go} storageDir={settings?.storageDir} version={version} recording={rec.active} storage={storage} onOpenStorage={openStorage} />
        <main
          className="qa-scroll"
          style={{ flex: 1, minWidth: 0, background: '#FAFBFB', overflow: replayMode ? 'hidden' : 'auto' }}
        >
          {screen === 'sessions' && (
            <Sessions sessions={sessions} view={view} setView={setView} global={global} onOpen={openSession} onNew={() => go('record')} onRelaunch={goProcessing} onDelete={deleteSession} onImport={importVideo} />
          )}
          {screen === 'record' && <Record rec={rec} onStart={startRec} onPause={pauseRec} onResume={resumeRec} onStop={stopRec} onCancel={backToList} />}
          {screen === 'processing' && <Processing sessionId={selectedId} onBack={backToList} onOpenReplay={(id) => { setSelectedId(id); setScreen('replay') }} />}
          {screen === 'replay' && <Replay sessionId={selectedId} onBack={backToList} />}
          {screen === 'settings' && <Settings onSaved={(s) => { setSettings(s); refreshCredits(); refreshStorage() }} />}
        </main>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} onOpen={openSearchResult} />

      {importing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,15,25,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '28px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, boxShadow: '0 24px 70px rgba(0,0,84,0.28)' }}>
            <div style={{ width: 30, height: 30, border: '3px solid #C9DCF2', borderTopColor: '#0C8CE9', borderRadius: 100, animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#000054' }}>Préparation de l’import…</div>
          </div>
        </div>
      )}
    </div>
  )
}
