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
    setScreen(s.status === 'PRETE' ? 'replay' : 'processing')
  }, [])

  const backToList = useCallback(() => {
    refreshSessions()
    setScreen('sessions')
  }, [refreshSessions])

  const goProcessing = useCallback((id) => {
    setSelectedId(id)
    setScreen('processing')
  }, [])

  const replayMode = screen === 'replay'

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      <TitleBar />
      <TopBar gPct={`${global.gPct}%`} gLabel={`${global.gPct}%`} credits={credits} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <NavRail screen={screen} go={go} storageDir={settings?.storageDir} version={version} />
        <main
          className="qa-scroll"
          style={{ flex: 1, minWidth: 0, background: '#FAFBFB', overflow: replayMode ? 'hidden' : 'auto' }}
        >
          {screen === 'sessions' && (
            <Sessions sessions={sessions} view={view} setView={setView} global={global} onOpen={openSession} onNew={() => go('record')} onRelaunch={goProcessing} />
          )}
          {screen === 'record' && <Record onStop={goProcessing} onCancel={backToList} />}
          {screen === 'processing' && <Processing sessionId={selectedId} onBack={backToList} onOpenReplay={(id) => { setSelectedId(id); setScreen('replay') }} />}
          {screen === 'replay' && <Replay sessionId={selectedId} onBack={backToList} />}
          {screen === 'settings' && <Settings onSaved={(s) => { setSettings(s); refreshCredits() }} />}
        </main>
      </div>
    </div>
  )
}
