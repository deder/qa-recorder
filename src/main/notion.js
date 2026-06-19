// Intégration Notion (jalon tickets).
// Pousse les bugs d'une session comme fiches dans la base "🐛 QA Recette – Suivi des problèmes".
// Utilise fetch global (Node 18+), comme settings.js pour OpenRouter — aucune dépendance npm.

const NOTION_VERSION = '2022-06-28'
const API = 'https://api.notion.com/v1/pages'

// bug.sev -> option "Criticité" (les noms doivent matcher EXACTEMENT, emojis inclus).
const SEV_TO_NOTION = {
  bloquant: '🔴 Bloquant',
  majeur: '🟠 Majeur',
  mineur: '🟡 Mineur',
}

// bug.status -> option "Statut".
const STATUS_TO_NOTION = {
  'a-corriger': '🆕 À traiter',
  'en-cours': '🔄 En cours',
  corrige: '✅ Résolu',
  verifie: '✅ Résolu',
  rejete: '❌ Rejeté',
}

const CAT_LABEL = {
  manquant: 'Élément manquant',
  fonctionnel: 'Bug fonctionnel',
  affichage: 'Affichage / UI',
  libelle: 'Libellé / Texte',
  performance: 'Performance',
  ux: 'UX / Parcours',
}

// "0:18" / "1:03:09"
function fmtTc(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

const txt = (s) => [{ text: { content: String(s ?? '').slice(0, 1900) } }]

function buildProperties(meta, bug) {
  const cat = CAT_LABEL[bug.cat] || bug.cat || '—'
  const desc = `${bug.desc || ''}\n\nCatégorie : ${cat} · Timecode : ${fmtTc(bug.tc)}`
  const env = [meta?.sources?.screen, meta?.sources?.mic].filter(Boolean).join(' · ') || 'QA Recorder'

  const props = {
    'Titre du problème': { title: txt(bug.title || `Bug ${bug.id}`) },
    Description: { rich_text: txt(desc) },
    'Navigateur / Environnement': { rich_text: txt(env) },
  }
  const sev = SEV_TO_NOTION[bug.sev]
  if (sev) props['Criticité'] = { select: { name: sev } }
  const status = STATUS_TO_NOTION[bug.status]
  if (status) props['Statut'] = { select: { name: status } }
  const start = meta?.createdAt
  if (start) props['Date de signalement'] = { date: { start } }
  return props
}

// Pousse une liste de bugs. Renvoie un tableau de résultats par bug :
//   { bugId, ok, notionUrl?, notionPageId?, error? }
export async function pushBugsToNotion(meta, bugs, { token, databaseId, onProgress } = {}) {
  if (!token) throw new Error('Token Notion manquant (Réglages → Intégration Notion).')
  if (!databaseId) throw new Error('ID de base Notion manquant (Réglages → Intégration Notion).')

  const headers = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
  const results = []
  let done = 0
  for (const bug of bugs) {
    try {
      const body = { parent: { database_id: databaseId }, properties: buildProperties(meta, bug) }
      const r = await fetch(API, { method: 'POST', headers, body: JSON.stringify(body) })
      if (!r.ok) {
        let msg = `HTTP ${r.status}`
        try {
          const j = await r.json()
          if (j?.message) msg = j.message
          if (r.status === 401) msg = 'Token Notion invalide (401).'
          if (r.status === 404) msg = 'Base introuvable ou non partagée avec l’intégration (404).'
        } catch { /* corps non JSON */ }
        results.push({ bugId: bug.id, ok: false, error: msg })
      } else {
        const j = await r.json()
        results.push({ bugId: bug.id, ok: true, notionUrl: j.url, notionPageId: j.id })
      }
    } catch (e) {
      results.push({ bugId: bug.id, ok: false, error: String(e.message || e) })
    }
    onProgress?.({ done: ++done, total: bugs.length })
  }
  return results
}
