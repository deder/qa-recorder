import { join } from 'node:path'
import fs from 'node:fs'
import { sessionDir, saveBugs } from './sessions/store.js'
import { getSettings } from './settings-store.js'

const SYSTEM = `Tu es un assistant QA. On te donne la TRANSCRIPTION HORODATÉE d'une session de test logiciel, où un testeur commente à voix haute. À chaque anomalie, le testeur prononce le mot-clé « bug ». Ta tâche : produire la liste structurée des bugs.

Règles :
- Chaque occurrence du mot « bug » marque le début d'un nouveau bug. Le "time" du bug est le timecode (HH:MM:SS) de cette occurrence (ou de la phrase qui l'introduit).
- "title" : reformulation courte et claire (max ~70 caractères).
- "description" : reformulation fidèle et complète de ce que décrit le testeur, en français correct, sans rien inventer d'absent de la transcription.
- "category" ∈ {manquant, fonctionnel, affichage, libelle, performance, ux}.
- "severity" ∈ {bloquant, majeur, mineur} (bloquant = plantage / fonction cassée critique).
- Ignore les passages hors-sujet. Ne fusionne pas deux bugs distincts ; ne scinde pas un même bug.
- Réponds UNIQUEMENT par un JSON valide de la forme {"bugs":[{"time":"HH:MM:SS","title":"...","description":"...","category":"...","severity":"..."}]}, sans texte autour.`

const CAT_KEYS = ['manquant', 'fonctionnel', 'affichage', 'libelle', 'performance', 'ux']
const SEV_KEYS = ['bloquant', 'majeur', 'mineur']

function normCat(v) {
  const s = String(v || '').toLowerCase()
  if (s.includes('manqu')) return 'manquant'
  if (s.includes('affich') || s.includes('ui')) return 'affichage'
  if (s.includes('libell') || s.includes('texte') || s.includes('label')) return 'libelle'
  if (s.includes('perf') || s.includes('lent')) return 'performance'
  if (s.includes('ux') || s.includes('parcours')) return 'ux'
  if (CAT_KEYS.includes(s)) return s
  return 'fonctionnel'
}
function normSev(v) {
  const s = String(v || '').toLowerCase()
  if (s.includes('bloq') || s.includes('critique')) return 'bloquant'
  if (s.includes('min')) return 'mineur'
  if (SEV_KEYS.includes(s)) return s
  return 'majeur'
}
function toSeconds(t) {
  if (typeof t === 'number') return Math.round(t)
  const p = String(t || '0').split(':').map((x) => parseInt(x, 10) || 0)
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2]
  if (p.length === 2) return p[0] * 60 + p[1]
  return p[0] || 0
}

function extractJson(text) {
  let t = String(text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) t = t.slice(start, end + 1)
  return JSON.parse(t)
}

const DEPRECATED = {
  'anthropic/claude-3.5-sonnet': 'anthropic/claude-sonnet-4.5',
  'anthropic/claude-3.7-sonnet': 'anthropic/claude-sonnet-4.5',
}
function resolveModel(setting) {
  if (setting && DEPRECATED[setting]) return DEPRECATED[setting]
  if (setting && setting.includes('/')) return setting
  return 'anthropic/claude-sonnet-4.5'
}

export async function analyze(id, fromStart, ctx) {
  const dir = sessionDir(id)
  const txtPath = join(dir, 'transcript.txt')
  if (!fs.existsSync(txtPath) || fs.statSync(txtPath).size === 0) {
    throw new Error('Transcription indisponible — impossible d’analyser les bugs.')
  }
  const { openrouterKey, analysisModel } = getSettings()
  if (!openrouterKey) {
    throw new Error('Clé API OpenRouter absente. Renseigne-la dans les Réglages puis relance.')
  }

  ctx?.emit?.(20)
  const transcript = fs.readFileSync(txtPath, 'utf-8')
  const model = resolveModel(analysisModel)

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://allmanager.fr',
      'X-Title': 'QA Session Recorder',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: transcript },
      ],
    }),
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    let detail = body.slice(0, 300)
    try { detail = JSON.parse(body)?.error?.message || detail } catch { /* garde le texte brut */ }
    throw new Error(`OpenRouter ${resp.status} (${model}) : ${detail}`)
  }
  ctx?.emit?.(70)

  const data = await resp.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Réponse OpenRouter vide')

  const parsed = extractJson(content)
  const rawBugs = Array.isArray(parsed) ? parsed : parsed.bugs || []
  const bugs = rawBugs.map((b, i) => ({
    id: i + 1,
    tc: toSeconds(b.time ?? b.tc),
    cat: normCat(b.category ?? b.cat),
    sev: normSev(b.severity ?? b.sev),
    status: 'a-corriger',
    title: String(b.title || '').slice(0, 140) || 'Bug',
    desc: String(b.description || b.desc || '').trim(),
  })).sort((a, b) => a.tc - b.tc).map((b, i) => ({ ...b, id: i + 1 }))

  if (!bugs.length) throw new Error('Aucun bug extrait de la transcription.')
  saveBugs(id, bugs)
  ctx?.emit?.(100)
}
