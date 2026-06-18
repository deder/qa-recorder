// Génère src/main/sessions/seed-bugs.js depuis les 40 bugs du prototype bug-review.
import { pathToFileURL } from 'node:url'
import { writeFileSync } from 'node:fs'

const dataUrl = pathToFileURL('D:/Projects/po-QA/bug-review/src/data.js').href
const { videos } = await import(dataUrl)

const catMap = {
  Manquant: 'manquant',
  Fonctionnel: 'fonctionnel',
  Affichage: 'affichage',
  Libellé: 'libelle',
  Performance: 'performance',
  UX: 'ux',
}
const sevMap = { Bloquant: 'bloquant', Majeur: 'majeur', Mineur: 'mineur' }

function toSec(t) {
  const p = t.split(':').map(Number)
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]
}

const bugs = videos[0].bugs.map((b) => ({
  id: b.id,
  tc: toSec(b.time),
  cat: catMap[b.category],
  sev: sevMap[b.severity],
  status: 'a-corriger',
  title: b.title,
  desc: b.description,
}))

const out = 'export default ' + JSON.stringify(bugs, null, 2) + '\n'
writeFileSync('D:/Projects/po-QA/qa-recorder/src/main/sessions/seed-bugs.js', out, 'utf-8')
console.log('wrote', bugs.length, 'bugs to seed-bugs.js')
