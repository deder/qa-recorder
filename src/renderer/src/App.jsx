import { useEffect, useMemo, useState, useCallback } from 'react'
import TitleBar from './shell/TitleBar.jsx'
import TopBar from './shell/TopBar.jsx'
import NavRail from './shell/NavRail.jsx'
import Sessions from './screens/Sessions.jsx'
import Record from './screens/Record.jsx'
import Processing from './screens/Processing.jsx'
import Replay from './screens/Replay.jsx'
import Settings from './screens/Settings.jsx'

const api = window.api

export default function App() {
  const [screen, setScreen] = useState('sessions')
  const [view, setView] = useState('cards')
  const [selectedId, setSelectedId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [settings, setSettings] = useState(null)
  const [version, setVersion] = useState('0.9.2')
  const [credits, setCredits] = useState(null)
  // État d'enregistrement GLOBAL (persiste quand on change d'écran)
  const [rec, setRec] = useState({ active: false, state: 'idle', sessionId: null, elapsed: 0 })

  const refreshSessions = useCallback(async () => {
    setSessions(await api.sessions.list())
  }, [])

  const refreshCredits = useCallback(() => {
    api.settings.openrouterCredits().then(setCredits).catch(() => {})
  }, [])

  useEffect(() => {
    refreshSessions()
    api.settings.get().then(setSettings)
    api.system.version().then(setVersion)
  }, [refreshSessions])

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

  // Chrono d'enregistrement (continue même hors de l'écran d'enregistrement)
  useEffect(() => {
    if (rec.state !== 'recording') return
    const t = setInterval(() => setRec((r) => ({ ...r, elapsed: r.elapsed + 1 })), 1000)
    return () => clearInterval(t)
  }, [rec.state])

  const startRec = useCallback(async (opts) => {
    const id = await api.recording.start(opts)
    setRec({ active: true, state: 'recording', sessionId: id, elapsed: 0 })
  }, [])
  const pauseRec = useCallback(async () => { await api.recording.pause(); setRec((r) => ({ ...r, state: 'paused' })) }, [])
  const resumeRec = useCallback(async () => { await api.recording.resume(); setRec((r) => ({ ...r, state: 'recording' })) }, [])
  const stopRec = useCallback(async () => {
    const id = await api.recording.stop()
    const sid = id || rec.sessionId
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
  }, [rec.sessionId, refreshSessions])

  const importVideo = useCallback(async () => {
    const id = await api.sessions.import()
    if (id) { setSelectedId(id); setScreen('processing') }
  }, [])

  const replayMode = screen === 'replay'

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      <TitleBar />
      <TopBar gPct={`${global.gPct}%`} gLabel={`${global.gPct}%`} credits={credits} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <NavRail screen={screen} go={go} storageDir={settings?.storageDir} version={version} recording={rec.active} />
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
          {screen === 'settings' && <Settings onSaved={(s) => { setSettings(s); refreshCredits() }} />}
        </main>
      </div>
    </div>
  )
}
