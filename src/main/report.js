import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import fs from 'node:fs'
import { sessionDir, loadSession } from './sessions/store.js'
import { grabFrame } from './frames.js'

// Tokens (miroir de renderer/src/lib/tokens.js — le main ne peut pas importer le renderer).
const CATS = {
  manquant: { label: 'Élément manquant', color: '#ED6C02', bg: '#FFF4E5' },
  fonctionnel: { label: 'Bug fonctionnel', color: '#E64C35', bg: '#FDECEA' },
  affichage: { label: 'Affichage / UI', color: '#0C8CE9', bg: '#E5F2FD' },
  libelle: { label: 'Libellé / Texte', color: '#8218E2', bg: '#EEE5FF' },
  performance: { label: 'Performance', color: '#E0398A', bg: '#FCE4F1' },
  ux: { label: 'UX / Parcours', color: '#03B2BD', bg: '#E0F7F8' },
}
const SEVS = {
  bloquant: { label: 'Bloquant', color: '#E64C35', bg: '#FDECEA' },
  majeur: { label: 'Majeur', color: '#ED6C02', bg: '#FFF4E5' },
  mineur: { label: 'Mineur', color: '#595987', bg: '#F3F4F6' },
}
const STATUSES = {
  'a-corriger': { label: 'À corriger', color: '#595987', bg: '#F3F4F6' },
  'en-cours': { label: 'En cours', color: '#0862A3', bg: '#E5F2FD' },
  corrige: { label: 'Corrigé', color: '#317D51', bg: '#E8F5EC' },
  verifie: { label: 'Vérifié', color: '#03808A', bg: '#E0F7F8' },
  rejete: { label: 'Rejeté', color: '#A13525', bg: '#FBEAE7' },
}
const FIXED = ['corrige', 'verifie']

function fmtTc(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function chip(label, color, bg) {
  return `<span style="display:inline-block;padding:2px 9px;border-radius:100px;font-size:11px;font-weight:700;color:${color};background:${bg};">${esc(label)}</span>`
}

function buildHtml(meta, bugs, frames) {
  const total = bugs.length
  const fixed = bugs.filter((b) => FIXED.includes(b.status)).length
  const pct = total ? Math.round((fixed / total) * 100) : 0
  const bySev = (k) => bugs.filter((b) => b.sev === k).length

  const cards = bugs.map((b) => {
    const cat = CATS[b.cat] || CATS.affichage
    const sev = SEVS[b.sev] || SEVS.mineur
    const st = STATUSES[b.status] || STATUSES['a-corriger']
    const img = frames[b.id] ? `<img src="${frames[b.id]}" style="width:220px;border-radius:8px;border:1px solid #E5E7EB;flex:none;" />` : ''
    return `
      <div style="display:flex;gap:16px;padding:16px;border:1px solid #E5E7EB;border-radius:12px;page-break-inside:avoid;margin-bottom:14px;">
        ${img}
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="width:22px;height:22px;border-radius:6px;background:#F3F4F6;color:#595987;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;">${b.id}</span>
            <span style="font-size:12px;font-weight:700;color:#595987;">${fmtTc(b.tc)}</span>
            ${chip(sev.label, sev.color, sev.bg)}
            ${chip(cat.label, cat.color, cat.bg)}
            ${chip(st.label, st.color, st.bg)}
          </div>
          <div style="font-size:15px;font-weight:700;color:#000054;margin-bottom:6px;">${esc(b.title)}</div>
          <div style="font-size:12.5px;color:#595987;line-height:1.5;">${esc(b.desc)}</div>
        </div>
      </div>`
  }).join('')

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Mulish, sans-serif; color: #000054; margin: 0; padding: 32px; }
    .stat { background:#F4F6FA;border:1px solid #E5E7EB;border-radius:10px;padding:12px 16px;flex:1; }
    .stat .n { font-size:22px;font-weight:800; }
    .stat .l { font-size:11px;color:#595987;font-weight:600;text-transform:uppercase;letter-spacing:.5px; }
  </style></head><body>
    <div style="border-bottom:2px solid #000054;padding-bottom:14px;margin-bottom:20px;">
      <div style="font-size:13px;color:#0C8CE9;font-weight:700;">RAPPORT QA</div>
      <div style="font-size:26px;font-weight:800;">${esc(meta?.name || 'Session')}</div>
      <div style="font-size:13px;color:#595987;margin-top:4px;">${esc(meta?.date || '')} · ${total} bug(s) · ${pct}% corrigés</div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:24px;">
      <div class="stat"><div class="n">${total}</div><div class="l">Bugs</div></div>
      <div class="stat"><div class="n" style="color:#317D51;">${fixed}</div><div class="l">Corrigés</div></div>
      <div class="stat"><div class="n" style="color:#E64C35;">${bySev('bloquant')}</div><div class="l">Bloquants</div></div>
      <div class="stat"><div class="n" style="color:#ED6C02;">${bySev('majeur')}</div><div class="l">Majeurs</div></div>
      <div class="stat"><div class="n" style="color:#595987;">${bySev('mineur')}</div><div class="l">Mineurs</div></div>
    </div>
    ${cards || '<div style="color:#949DB2;">Aucun bug.</div>'}
  </body></html>`
}

// Génère rapport.pdf dans le dossier de la session et renvoie son chemin.
export async function exportSessionPdf(sessionId) {
  const session = loadSession(sessionId)
  if (!session) throw new Error('Session introuvable.')
  const { meta } = session
  const bugs = (session.bugs || []).slice().sort((a, b) => a.tc - b.tc)

  // Vignette par bug (data URI base64 pour l'inliner dans le HTML).
  const frames = {}
  for (const b of bugs) {
    const p = await grabFrame(sessionId, b.tc, `bug-${b.id}.jpg`)
    if (p) {
      try { frames[b.id] = 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64') } catch { /* ignore */ }
    }
  }

  const html = buildHtml(meta, bugs, frames)
  const tmpHtml = join(app.getPath('temp'), `qa-report-${sessionId}.html`)
  fs.writeFileSync(tmpHtml, html, 'utf-8')

  const out = join(sessionDir(sessionId), 'rapport.pdf')
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
  try {
    await win.loadFile(tmpHtml)
    const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
    fs.writeFileSync(out, pdf)
  } finally {
    win.destroy()
    try { fs.unlinkSync(tmpHtml) } catch { /* ignore */ }
  }
  return out
}
