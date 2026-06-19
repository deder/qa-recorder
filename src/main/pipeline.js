import { join } from 'node:path'
import fs from 'node:fs'
import { sessionDir, readMeta, writeMeta } from './sessions/store.js'
import { findDemoVideo } from './sessions/seed.js'
import { runFfmpeg, probeDuration, hasAudioStream } from './ffmpeg.js'
import { STATUS, PROC_STEPS } from './sessions/steps.js'

// J3 remplacera transcribeStep + analyzeStep par whisper.cpp + OpenRouter.
import { transcribe as realTranscribe } from './transcribe.js'
import { analyze as realAnalyze } from './analyze.js'

const running = new Set()

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
    case 0: return ex('session.mkv') || ex('session.mp4')
    case 1: return ex('session.mp4')
    case 2: return nonEmpty('transcript.txt')
    case 3: try { return (JSON.parse(fs.readFileSync(join(d, 'bugs.json'), 'utf-8')).bugs || []).length > 0 } catch { return false }
    default: return false
  }
}

async function finalizeStep(id, fromStart) {
  const dir = sessionDir(id)
  const mkv = join(dir, 'session.mkv')
  const mp4 = join(dir, 'session.mp4')
  const segs = listSegments(id)

  if (segs.length) {
    if (fromStart || !fs.existsSync(mkv)) {
      const listFile = join(dir, 'concat.txt')
      fs.writeFileSync(listFile, segs.map((s) => `file '${s.replace(/\\/g, '/')}'`).join('\n'), 'utf-8')
      await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', mkv])
    }
    return
  }
  if (fs.existsSync(mkv)) return
  // Aucun enregistrement (session démo / mock) : on retombe sur la vidéo de démonstration.
  if (!fs.existsSync(mp4)) {
    const demo = findDemoVideo()
    if (demo) fs.copyFileSync(demo, mp4)
  }
}

async function convertStep(id, fromStart) {
  const dir = sessionDir(id)
  const mkv = join(dir, 'session.mkv')
  const mp4 = join(dir, 'session.mp4')
  const wav = join(dir, 'audio.wav')

  if (fs.existsSync(mkv) && (fromStart || !fs.existsSync(mp4))) {
    try {
      await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-i', mkv, '-c', 'copy', '-movflags', '+faststart', mp4])
    } catch {
      // codecs incompatibles avec MP4 → ré-encodage
      await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-i', mkv, '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-movflags', '+faststart', mp4])
    }
  }

  const audioSrc = fs.existsSync(mkv) ? mkv : mp4
  if (fs.existsSync(audioSrc) && (fromStart || !fs.existsSync(wav))) {
    if (await hasAudioStream(audioSrc)) {
      await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-i', audioSrc, '-vn', '-ac', '1', '-ar', '16000', wav])
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
      const m = readMeta(id)
      writeMeta(id, { ...m, status: STATUS.PROCESSING, procStep: step, procPct: 0, procDetail: null, procEta: null, error: null })
      emit({ status: STATUS.PROCESSING, step, pct: 5 })

      const ctx = { emit: (pct, extra = {}) => { const mm = readMeta(id); writeMeta(id, { ...mm, procPct: pct, procDetail: extra.detail ?? null, procEta: extra.eta ?? null }); emit({ status: STATUS.PROCESSING, step, pct, ...extra }) } }
      await STEP_FNS[step](id, fromStart, ctx)

      emit({ status: STATUS.PROCESSING, step, pct: 100 })
    }

    const m = readMeta(id)
    writeMeta(id, { ...m, status: STATUS.PRETE, procStep: PROC_STEPS.length, procPct: 100, error: null })
    emit({ status: STATUS.PRETE, step: PROC_STEPS.length, pct: 100, done: true })
  } catch (e) {
    console.error('pipeline failed', e)
    const m = readMeta(id)
    writeMeta(id, { ...m, status: STATUS.ERREUR, error: String(e.message || e) })
    emit({ status: STATUS.ERREUR, step: m?.procStep || 0, error: String(e.message || e) })
  } finally {
    running.delete(id)
  }
}
