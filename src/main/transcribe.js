import { app } from 'electron'
import { join } from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { sessionDir } from './sessions/store.js'
import { transcriptionPlan } from './gpu.js'

// Localise un binaire whisper.cpp embarqué (cible distribuable, jalon J4).
function whisperCppBin() {
  const dir = join(process.resourcesPath || '', 'bin')
  for (const name of ['whisper-cli.exe', 'main.exe']) {
    const p = join(dir, name)
    if (fs.existsSync(p)) return p
  }
  return null
}
function whisperCppModel() {
  const dir = join(process.resourcesPath || '', 'models')
  try {
    const f = fs.readdirSync(dir).find((x) => /\.(bin|gguf)$/i.test(x))
    return f ? join(dir, f) : null
  } catch {
    return null
  }
}

// Chemin du sidecar Python faster-whisper (moteur de dev).
function fwScript() {
  const candidates = [
    join(process.resourcesPath || '', 'py', 'transcribe_fw.py'),
    join(app.getAppPath(), 'src', 'main', 'py', 'transcribe_fw.py'),
    join(process.cwd(), 'src', 'main', 'py', 'transcribe_fw.py'),
  ]
  return candidates.find((p) => fs.existsSync(p)) || null
}

function srtToTxt(srt) {
  // SRT -> lignes "[HH:MM:SS.mmm -> ...] texte"
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

function runWhisperCpp(bin, model, wav, outTxt, ctx) {
  return new Promise((resolve, reject) => {
    const prefix = outTxt.replace(/\.txt$/, '')
    const args = ['-m', model, '-f', wav, '-l', 'fr', '-osrt', '-of', prefix]
    const p = spawn(bin, args, { windowsHide: true })
    p.stderr.on('data', (d) => {
      const s = d.toString()
      const m = s.match(/(\d+)%/)
      if (m) ctx?.emit?.(Math.min(99, parseInt(m[1], 10)))
    })
    p.on('error', reject)
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error('whisper.cpp exited ' + code))
      try {
        const srt = fs.readFileSync(prefix + '.srt', 'utf-8')
        fs.writeFileSync(outTxt, srtToTxt(srt), 'utf-8')
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })
}

function mmss(sec) {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function runFasterWhisper(wav, outTxt, plan, ctx) {
  return new Promise((resolve, reject) => {
    const script = fwScript()
    if (!script) return reject(new Error('Sidecar de transcription introuvable'))
    const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' }
    const startWall = Date.now()
    const p = spawn('python', [script, wav, outTxt, plan.model, plan.device, plan.compute], { windowsHide: true, env })
    let err = ''
    let buf = ''
    p.stdout.on('data', (d) => {
      buf += d.toString()
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (const line of lines) {
        const m = line.match(/PROGRESS\s+([\d.]+)\s+([\d.]+)/)
        if (!m) continue
        const done = parseFloat(m[1]); const total = Math.max(0.1, parseFloat(m[2]))
        const pct = Math.min(99, Math.round((done / total) * 100))
        // ETA basée sur la vitesse réelle (temps écoulé / audio traité)
        const wall = (Date.now() - startWall) / 1000
        const eta = done > 0.5 ? Math.round(((total - done) * wall) / done) : null
        ctx?.emit?.(pct, { eta, detail: `${mmss(done)} / ${mmss(total)} d'audio transcrit` })
      }
    })
    p.stderr.on('data', (d) => (err += d.toString()))
    p.on('error', (e) => reject(new Error('Python introuvable ? ' + e.message)))
    p.on('close', (code) => {
      if (code === 0 && fs.existsSync(outTxt)) resolve()
      else reject(new Error('faster-whisper a échoué : ' + err.slice(-400)))
    })
  })
}

export async function transcribe(id, fromStart, ctx) {
  const dir = sessionDir(id)
  const wav = join(dir, 'audio.wav')
  const txt = join(dir, 'transcript.txt')

  if (!fromStart && fs.existsSync(txt) && fs.statSync(txt).size > 0) {
    ctx?.emit?.(100)
    return
  }
  if (!fs.existsSync(wav)) throw new Error('Audio introuvable pour la transcription (audio.wav)')

  ctx?.emit?.(8)
  const bin = whisperCppBin()
  const model = whisperCppModel()
  if (bin && model) {
    await runWhisperCpp(bin, model, wav, txt, ctx)
  } else {
    await runFasterWhisper(wav, txt, transcriptionPlan(), ctx)
  }
  ctx?.emit?.(100)
}
