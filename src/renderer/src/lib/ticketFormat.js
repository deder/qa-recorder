import { CATS, SEVS, STATUSES } from './tokens.js'
import { fmt } from './format.js'

// Un bug -> bloc Markdown (réutilisé pour la copie presse-papier et l'aperçu ticket).
export function bugToMarkdown(b) {
  const cat = CATS[b.cat]?.full || b.cat || '—'
  const sev = SEVS[b.sev]?.label || b.sev || '—'
  const st = STATUSES[b.status]?.label || b.status || '—'
  return [
    `### ${b.title || `Bug ${b.id}`}`,
    `- **Sévérité** : ${sev}`,
    `- **Catégorie** : ${cat}`,
    `- **Statut** : ${st}`,
    `- **Timecode** : ${fmt(b.tc)}`,
    '',
    b.desc || '',
  ].join('\n').trimEnd()
}

// Liste de bugs -> document Markdown complet.
export function bugsToMarkdown(meta, bugs) {
  const header = `# ${meta?.name || 'Session'}\n_${meta?.date || ''} · ${bugs.length} bug(s)_`
  return [header, ...bugs.map(bugToMarkdown)].join('\n\n---\n\n')
}
