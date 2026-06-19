import { useEffect, useState } from 'react'

const api = window.api

const card = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }
const label = { fontSize: 13, fontWeight: 700, color: '#595987' }
const field = { height: 44, padding: '0 14px', border: '1px solid #E0E0E0', borderRadius: 8, fontFamily: 'Mulish', fontSize: 14, color: '#000054', outline: 'none', background: '#fff' }

export default function Settings({ onSaved }) {
  const [s, setS] = useState(null)

  useEffect(() => { api.settings.get().then(setS) }, [])
  if (!s) return null

  const set = (k) => (e) => setS({ ...s, [k]: e.target.value })

  const browse = async () => {
    const dir = await api.settings.browseFolder()
    if (dir) setS({ ...s, storageDir: dir })
  }

  const save = async () => {
    const next = await api.settings.set(s)
    setS(next)
    onSaved?.(next)
  }

  const radio = (key, val, text) => {
    const active = s.computeMode === val
    return (
      <div onClick={() => setS({ ...s, computeMode: val })} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: active ? '2px solid #0C8CE9' : '1px solid #E0E0E0', borderRadius: 8, background: active ? '#F4FAFE' : '#fff', fontSize: 13, fontWeight: active ? 600 : 500, color: active ? '#0862A3' : '#595987', cursor: 'pointer' }}>
        <span style={{ width: 14, height: 14, borderRadius: 100, border: active ? '4px solid #0C8CE9' : '1px solid #C0C3CE' }} />{text}
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 880 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#000054', margin: 0 }}>Réglages</h1>
        <div style={{ fontSize: 14, color: '#595987', marginTop: 4 }}>Analyse, transcription, stockage et performances.</div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#000054' }}>API & modèles</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={label}>Clé API OpenRouter</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="password" value={s.openrouterKey} onChange={set('openrouterKey')} placeholder="sk-or-..." style={{ ...field, flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: 8, background: s.openrouterKey ? '#E8F5EC' : '#F3F4F6', color: s.openrouterKey ? '#317D51' : '#949DB2', fontSize: 13, fontWeight: 700 }}>{s.openrouterKey ? '✓ Renseignée' : '— Absente'}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={label}>Modèle d’analyse (OpenRouter)</div>
            <select value={s.analysisModel} onChange={set('analysisModel')} style={field}>
              <option value="anthropic/claude-sonnet-4.5">Claude Sonnet 4.5 — qualité élevée</option>
              <option value="openai/gpt-4o">GPT-4o — équilibré</option>
              <option value="google/gemini-3.5-flash">Gemini 3.5 Flash — économique</option>
              <option value="deepseek/deepseek-chat-v3.1">DeepSeek v3.1 — très économique</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={label}>Modèle de transcription (local)</div>
            <select value={s.transcriptionModel} onChange={set('transcriptionModel')} style={field}>
              <option value="large-v3">large-v3 (qualité, GPU)</option>
              <option value="large-v3-turbo">large-v3-turbo (rapide, CPU)</option>
              <option value="medium">medium</option>
            </select>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#000054' }}>Stockage & encodage</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={label}>Dossier de stockage</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={s.storageDir} onChange={set('storageDir')} style={{ ...field, flex: 1 }} />
            <button className="hov-grey" onClick={browse} style={{ height: 44, padding: '0 16px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#000054', background: '#fff', cursor: 'pointer' }}>Parcourir…</button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8, background: '#F4FAFE', border: '1px solid #D7EAFB' }}>
          <span style={{ color: '#0C8CE9', fontSize: 16 }}>ⓘ</span>
          <div style={{ fontSize: 13, color: '#0862A3' }}>La <b>résolution</b> et les <b>images par seconde</b> sont déterminées automatiquement d’après l’écran capturé — rien à régler.</div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#000054' }}>Performances</div>
        <div style={label}>Mode de calcul (transcription)</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {radio('computeMode', 'auto', 'Auto (GPU si dispo)')}
          {radio('computeMode', 'gpu', 'Forcer GPU')}
          {radio('computeMode', 'cpu', 'Forcer CPU')}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="hov-navy" onClick={save} style={{ height: 40, padding: '0 20px', borderRadius: 8, background: '#000054', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Enregistrer les réglages</button>
      </div>
    </div>
  )
}
