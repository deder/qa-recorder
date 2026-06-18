import { join } from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { ffmpegPath } from './ffmpeg.js'
import { sessionDir } from './sessions/store.js'

// Enregistreur segmenté : un segment .mkv par tranche (pause = fin de segment).
// À l'arrêt, les segments sont concaténés sans ré-encodage (cf. pipeline.finalize).
let current = null // { id, idx, proc, opts }

function segmentsDir(id) {
  const d = join(sessionDir(id), 'segments')
  fs.mkdirSync(d, { recursive: true })
  return d
}

function buildArgs(opts, segFile) {
  const fps = String(parseInt(opts.fps, 10) || 30)
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'gdigrab', '-framerate', fps]
  if (opts.sourceType === 'window' && opts.sourceTitle) args.push('-i', `title=${opts.sourceTitle}`)
  else args.push('-i', 'desktop')
  if (opts.micName) args.push('-f', 'dshow', '-i', `audio=${opts.micName}`)
  args.push('-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p')
  if (opts.micName) args.push('-c:a', 'aac', '-b:a', '160k')
  args.push(segFile)
  return args
}

function spawnSegment(id, idx, opts) {
  const segFile = join(segmentsDir(id), `seg_${String(idx).padStart(3, '0')}.mkv`)
  const proc = spawn(ffmpegPath(), buildArgs(opts, segFile), { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] })
  proc.stderr.on('data', (d) => console.error('[rec ffmpeg]', d.toString().trim()))
  return { proc, segFile }
}

// Arrêt propre d'un segment : 'q' sur stdin, repli kill après timeout.
function stopSegment(proc) {
  return new Promise((resolve) => {
    if (!proc || proc.exitCode !== null) return resolve()
    let done = false
    const finish = () => { if (!done) { done = true; resolve() } }
    proc.on('close', finish)
    try { proc.stdin.write('q') } catch { /* noop */ }
    setTimeout(() => { try { proc.kill('SIGKILL') } catch { /* noop */ } finish() }, 2500)
  })
}

export function startRecording(id, opts) {
  current = { id, idx: 0, opts, segments: [] }
  const { proc, segFile } = spawnSegment(id, 0, opts)
  current.proc = proc
  current.segments.push(segFile)
}

export async function pauseRecording() {
  if (!current?.proc) return
  await stopSegment(current.proc)
  current.proc = null
}

export function resumeRecording() {
  if (!current) return
  current.idx += 1
  const { proc, segFile } = spawnSegment(current.id, current.idx, current.opts)
  current.proc = proc
  current.segments.push(segFile)
}

export async function stopRecording() {
  if (!current) return { id: null, segments: [] }
  if (current.proc) await stopSegment(current.proc)
  const res = { id: current.id, segments: current.segments.filter((f) => fs.existsSync(f)) }
  current = null
  return res
}

export function isRecording() {
  return !!current
}
