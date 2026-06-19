import { spawn } from 'node:child_process'
import { join } from 'node:path'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import { srtToTxt } from './srt.js'

// Serveur whisper.cpp RÉSIDENT : lancé une fois au démarrage de l'app, il charge le
// modèle GGUF en mémoire et reste vivant jusqu'à la fermeture. Chaque transcription
// devient un simple POST HTTP /inference (plus aucun rechargement du modèle).
// Cible 100% autonome (aucune dépendance Python sur le poste).

let state = null
// state = { proc, port, ready, starting, unavailable, queue:[], busy, active, stopping }
let broadcaster = null
let lastStatus = { state: 'idle' }

// Source unique de vérité du statut : mémorise le dernier état ET le diffuse.
// Permet à un renderer qui s'abonne tardivement de récupérer l'état via getWhisperStatus().
function emitStatus(payload) {
  lastStatus = payload
  try { broadcaster?.('whisper:status', payload) } catch { /* noop */ }
}

export function getWhisperStatus() {
  return lastStatus
}

function binDir() {
  return join(process.resourcesPath || '', 'bin')
}
function serverBin() {
  for (const name of ['whisper-server.exe', 'server.exe']) {
    const p = join(binDir(), name)
    if (fs.existsSync(p)) return p
  }
  return null
}
function modelPath() {
  const dir = join(process.resourcesPath || '', 'models')
  try {
    const f = fs.readdirSync(dir).find((x) => /\.(bin|gguf)$/i.test(x))
    return f ? join(dir, f) : null
  } catch {
    return null
  }
}

function findFreePort() {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.on('error', () => resolve(8765))
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port
      srv.close(() => resolve(port))
    })
  })
}

// Le serveur whisper.cpp charge le modèle PUIS écoute : un connect TCP réussi ⇒ modèle prêt.
function tcpProbe(port) {
  return new Promise((resolve) => {
    const sock = net.connect(port, '127.0.0.1')
    sock.setTimeout(1000)
    const done = (v) => { try { sock.destroy() } catch { /* noop */ } resolve(v) }
    sock.on('connect', () => done(true))
    sock.on('error', () => done(false))
    sock.on('timeout', () => done(false))
  })
}

export function isWhisperServiceUsable() {
  return !!state && !state.unavailable
}
export function isWhisperServerReady() {
  return !!state?.ready
}

export async function startWhisperService(broadcast) {
  if (broadcast) broadcaster = broadcast
  if (state && (state.ready || state.starting)) return
  const bin = serverBin()
  const model = modelPath()
  if (!bin || !model) {
    state = { unavailable: true }
    emitStatus({ state: 'unavailable', reason: bin ? 'no-model' : 'no-binary' })
    return
  }

  const port = await findFreePort()
  state = { proc: null, port, ready: false, starting: true, queue: [], busy: false, active: null, stopping: false }
  emitStatus({ state: 'loading' })

  const threads = Math.max(1, (os.cpus()?.length || 4) - 1)
  const args = ['-m', model, '-l', 'fr', '--host', '127.0.0.1', '--port', String(port), '-t', String(threads)]
  const proc = spawn(bin, args, { windowsHide: true })
  state.proc = proc

  const markReady = () => {
    if (!state || state.ready) return
    state.ready = true
    state.starting = false
    emitStatus({ state: 'ready' })
    pump()
  }
  const scan = (s) => {
    routeProgress(s)
    if (/listening|server is listening|http:\/\//i.test(s)) markReady()
  }
  proc.stdout.on('data', (d) => scan(d.toString()))
  proc.stderr.on('data', (d) => scan(d.toString()))
  proc.on('error', (e) => failService(`whisper-server introuvable : ${e.message}`))
  proc.on('close', (code) => {
    if (!state) return
    if (state.stopping) { state = null; return }
    failService(`whisper-server arrêté (code ${code})`)
  })

  // Sonde TCP de secours : détecte la disponibilité même si la bannière stdout change selon les builds.
  pollUntilUp(port)
}

function pollUntilUp(port) {
  let n = 0
  const iv = setInterval(async () => {
    if (!state || state.ready || state.stopping || state.unavailable) { clearInterval(iv); return }
    n += 1
    if (await tcpProbe(port)) { clearInterval(iv); /* markReady via closure */ markReadyExternal() }
    else if (n > 240) clearInterval(iv) // ~2 min
  }, 500)
}
function markReadyExternal() {
  if (!state || state.ready) return
  state.ready = true
  state.starting = false
  emitStatus({ state: 'ready' })
  pump()
}

function failService(msg) {
  const pending = state ? [...state.queue, ...(state.active ? [state.active] : [])] : []
  if (state?.proc) { try { state.proc.kill() } catch { /* noop */ } }
  state = null
  for (const j of pending) { try { j.reject(new Error(msg)) } catch { /* noop */ } }
  emitStatus({ state: 'error', reason: msg })
}

export function stopWhisperService() {
  if (!state) return
  state.stopping = true
  const pending = [...state.queue, ...(state.active ? [state.active] : [])]
  if (state.proc) { try { state.proc.kill() } catch { /* noop */ } }
  for (const j of pending) { try { j.reject(new Error('service arrêté')) } catch { /* noop */ } }
  state = null
}

export function restartWhisperService(broadcast) {
  stopWhisperService()
  return startWhisperService(broadcast)
}

function routeProgress(s) {
  if (!state?.active) return
  const m = s.match(/(\d+)\s*%/)
  if (m) state.active.ctx?.emit?.(Math.min(99, parseInt(m[1], 10)))
}

function waitReady(timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    if (!state) return reject(new Error('service indisponible'))
    if (state.ready) return resolve()
    const t0 = Date.now()
    const iv = setInterval(() => {
      if (!state) { clearInterval(iv); reject(new Error('service arrêté')) }
      else if (state.ready) { clearInterval(iv); resolve() }
      else if (Date.now() - t0 > timeoutMs) { clearInterval(iv); reject(new Error('délai de chargement du modèle dépassé')) }
    }, 300)
  })
}

// Transcrit un .wav via le serveur résident. Sérialisé (un POST à la fois).
export function transcribeViaServer(wav, txt, ctx) {
  return new Promise((resolve, reject) => {
    if (!isWhisperServiceUsable()) return reject(new Error('whisper-server indisponible'))
    state.queue.push({ wav, txt, ctx, resolve, reject })
    pump()
  })
}

async function pump() {
  if (!state || state.busy || !state.ready) return
  const job = state.queue.shift()
  if (!job) return
  state.busy = true
  state.active = job
  try {
    await waitReady()
    job.ctx?.emit?.(1, { detail: 'Transcription…' })
    const buf = fs.readFileSync(job.wav)
    const form = new FormData()
    form.append('file', new Blob([buf], { type: 'audio/wav' }), 'audio.wav')
    form.append('response_format', 'srt')
    form.append('language', 'fr')
    form.append('temperature', '0')
    const res = await fetch(`http://127.0.0.1:${state.port}/inference`, { method: 'POST', body: form })
    if (!res.ok) throw new Error(`whisper-server HTTP ${res.status}`)
    const srt = await res.text()
    fs.writeFileSync(job.txt, srtToTxt(srt), 'utf-8')
    job.ctx?.emit?.(100)
    job.resolve()
  } catch (e) {
    job.reject(e)
  } finally {
    if (state) { state.busy = false; state.active = null }
    pump()
  }
}
