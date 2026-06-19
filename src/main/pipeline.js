import { join } from 'node:path'
import fs from 'node:fs'
import { screen } from 'electron'
import { sessionDir, readMeta, writeMeta } from './sessions/store.js'
import { runFfmpeg, probeDuration, hasAudioStream } from './ffmpeg.js'
import { STATUS, PROC_STEPS } from './sessions/steps.js'
import { transcribe as realTranscribe } from './transcribe.js'
import { analyze as realAnalyze } from './analyze.js'

// Canevas de normalisation pour les captures fenêtre (webm) : résolution de l'écran
// principal (dimensions paires). La fenêtre ne pouvant pas dépasser l'écran, son contenu
// est letterboxé sans rognage ni déformation.
function displayCanvas() {
  try {
    const d = screen.getPrimaryDisplay()
    let w = Math.round(d.size.width * d.scaleFactor)
    let h = Math.round(d.size.height * d.scaleFactor)
    w -= w % 2; h -= h % 2
    if (w >= 2 && h >= 2) return { w, h }
  } catch { /* écran indisponible : valeur de repli */ }
  return { w: 1920, h: 1080 }
}

const running = new Set()
const aborted = new Set()
const procs = new Map() // id -> Set<ChildProcess> (pour annuler/tuer le traitement)

export function registerProc(id, child) {
  if (!procs.has(id)) procs.set(id, new Set())
  const set = procs.get(id)
  set.add(child)
  child.on('close', () => set.delete(child))
}

// Annule un traitement en cours (tue les process ffmpeg/whisper) — utilisé par la suppression.
export function abortPipeline(id) {
  aborted.add(id)
  for (const c of procs.get(id) || []) { try { c.kill('SIGKILL') } catch { /* noop */ } }
}

function listSegments(id) {
  const segDir = join(sessionDir(id), 'segments')
  try {
    return fs.readdirSync(segDir).filter((f) => /^seg_\d+\.mkv$/.test(f)).sort().map((f) => join(segDir, f))
  } catch {
    return []
  }
}

// Une étape est-elle déjà aboutie (sa sortie existe) ? → permet de reprendre
// le traitement à la première étape non terminée plutôt que tout recalculer.
function isStepComplete(id, step) {
  const d = sessionDir(id)
  const ex = (f) => fs.existsSync(join(d, f))
  const nonEmpty = (f) => { try { return fs.statSync(join(d, f)).size > 0 } catch { return false } }
  switch (step) {
    case 0: return ex('session.mkv') || ex('session.mp4') || ex('session.webm')
    case 1: return ex('session.mp4')
    case 2: return nonEmpty('transcript.txt')
    case 3: try { return (JSON.parse(fs.readFileSync(join(d, 'bugs.json'), 'utf-8')).bugs || []).length > 0 } catch { return false }
    default: return false
  }
}

async function finalizeStep(id, fromStart, ctx) {
  const dir = sessionDir(id)
  const mkv = join(dir, 'session.mkv')
  const mp4 = join(dir, 'session.mp4')
  const allSegs = listSegments(id)
  // On ignore les segments vides : un segment 0 octet (capture qui n'a rien produit,
  // ffmpeg tué avant d'écrire l'en-tête) ferait échouer la concaténation
  // avec "EBML header parsing failed".
  const segs = allSegs.filter((s) => { try { return fs.statSync(s).size > 0 } catch { return false } })
  const onChild = (c) => ctx?.register?.(c)

  if (segs.length) {
    if (fromStart || !fs.existsSync(mkv)) {
      const listFile = join(dir, 'concat.txt')
      fs.writeFileSync(listFile, segs.map((s) => `file '${s.replace(/\\/g, '/')}'`).join('\n'), 'utf-8')
      await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', mkv], { onChild })
    }
    return
  }
  // Enregistrement maison (MKV), capture native fenêtre (WebM) ou vidéo importée (MP4/MKV) :
  // une source existante suffit, rien à concaténer.
  if (fs.existsSync(mkv) || fs.existsSync(mp4) || fs.existsSync(join(dir, 'session.webm'))) return
  // Des segments ont bien été créés mais tous vides → la capture n'a rien enregistré.
  if (allSegs.length) {
    throw new Error("L'enregistrement n'a capturé aucune image. La fenêtre ciblée était introuvable ou a été fermée trop tôt — vérifiez la fenêtre sélectionnée et réessayez.")
  }
  throw new Error('Aucun fichier vidéo pour cette session.')
}

async function convertStep(id, fromStart, ctx) {
  const dir = sessionDir(id)
  const mkv = join(dir, 'session.mkv')
  const mp4 = join(dir, 'session.mp4')
  const webm = join(dir, 'session.webm')
  const wav = join(dir, 'audio.wav')
  const onChild = (c) => ctx?.register?.(c)

  if (fs.existsSync(mkv) && (fromStart || !fs.existsSync(mp4))) {
    try {
      await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-i', mkv, '-c', 'copy', '-movflags', '+faststart', mp4], { onChild })
    } catch {
      // codecs incompatibles avec MP4 → ré-encodage
      await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-i', mkv, '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-movflags', '+faststart', mp4], { onChild })
    }
  } else if (fs.existsSync(webm) && (fromStart || !fs.existsSync(mp4))) {
    // Capture native (mode fenêtre) : WebM → MP4. On normalise vers un canevas fixe car
    // le flux peut changer de résolution si la fenêtre est redimensionnée (le H.264/MP4
    // exige des dimensions constantes ; eval=frame absorbe les changements). Contenu
    // letterboxé, jamais rogné ni déformé.
    const { w, h } = displayCanvas()
    const vf = `scale=${w}:${h}:force_original_aspect_ratio=decrease:eval=frame,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:eval=frame,format=yuv420p`
    await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-i', webm, '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-movflags', '+faststart', mp4], { onChild })
  }

  const audioSrc = fs.existsSync(mkv) ? mkv : fs.existsSync(webm) ? webm : mp4
  if (fs.existsSync(audioSrc) && (fromStart || !fs.existsSync(wav))) {
    if (await hasAudioStream(audioSrc)) {
      await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-i', audioSrc, '-vn', '-ac', '1', '-ar', '16000', wav], { onChild })
    }
  }

  // durée réelle
  const dur = await probeDuration(fs.existsSync(mp4) ? mp4 : audioSrc)
  if (dur) {
    const m = readMeta(id)
    if (m) writeMeta(id, { ...m, durationSec: dur })
  }
}

const STEP_FNS = [
  finalizeStep,
  convertStep,
  (id, fromStart, ctx) => realTranscribe(id, fromStart, ctx),
  (id, fromStart, ctx) => realAnalyze(id, fromStart, ctx),
]

export async function runPipeline(id, fromStart, broadcast) {
  if (running.has(id)) return
  running.add(id)
  const emit = (patch) => broadcast?.('sessions:progress', { id, ...patch })

  try {
    // Reprise : on saute les étapes déjà terminées (sauf si fromStart force tout).
    let start = 0
    if (!fromStart) { while (start < STEP_FNS.length && isStepComplete(id, start)) start++ }
    if (start > 0) {
      const m0 = readMeta(id)
      writeMeta(id, { ...m0, status: STATUS.PROCESSING, procStep: start, procPct: 0, error: null })
      emit({ status: STATUS.PROCESSING, step: start, pct: 0 })
    }

    for (let step = start; step < STEP_FNS.length; step++) {
      if (aborted.has(id)) throw new Error('Traitement annulé')
      const m = readMeta(id)
      writeMeta(id, { ...m, status: STATUS.PROCESSING, procStep: step, procPct: 0, procDetail: null, procEta: null, error: null })
      emit({ status: STATUS.PROCESSING, step, pct: 5 })

      const ctx = {
        register: (child) => registerProc(id, child),
        emit: (pct, extra = {}) => { const mm = readMeta(id); writeMeta(id, { ...mm, procPct: pct, procDetail: extra.detail ?? null, procEta: extra.eta ?? null }); emit({ status: STATUS.PROCESSING, step, pct, ...extra }) },
      }
      await STEP_FNS[step](id, fromStart, ctx)

      emit({ status: STATUS.PROCESSING, step, pct: 100 })
    }

    const m = readMeta(id)
    writeMeta(id, { ...m, status: STATUS.PRETE, procStep: PROC_STEPS.length, procPct: 100, error: null })
    emit({ status: STATUS.PRETE, step: PROC_STEPS.length, pct: 100, done: true })
  } catch (e) {
    if (aborted.has(id)) {
      // Annulé volontairement (suppression) — pas un échec à signaler.
      console.log('pipeline aborted', id)
    } else {
      console.error('pipeline failed', e)
      const m = readMeta(id)
      if (m) {
        writeMeta(id, { ...m, status: STATUS.ERREUR, error: String(e.message || e) })
        emit({ status: STATUS.ERREUR, step: m.procStep || 0, error: String(e.message || e) })
      }
    }
  } finally {
    running.delete(id)
    aborted.delete(id)
    procs.delete(id)
  }
}
