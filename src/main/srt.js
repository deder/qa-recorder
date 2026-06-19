// Conversion SRT -> lignes "[HH:MM:SS.mmm -> ...] texte" (format attendu par analyze.js).
// Partagé par transcribe.js (whisper.cpp CLI) et whisper-service.js (serveur whisper.cpp).
export function srtToTxt(srt) {
  const blocks = srt.split(/\r?\n\r?\n/)
  const out = []
  for (const b of blocks) {
    const m = b.match(/(\d\d:\d\d:\d\d[,.]\d\d\d)\s*-->\s*(\d\d:\d\d:\d\d[,.]\d\d\d)\s*([\s\S]*)/)
    if (!m) continue
    const text = m[3].replace(/\s+/g, ' ').trim()
    if (text) out.push(`[${m[1].replace(',', '.')} -> ${m[2].replace(',', '.')}] ${text}`)
  }
  return out.join('\n') + '\n'
}
