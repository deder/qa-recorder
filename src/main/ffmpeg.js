import { app } from 'electron'
import { join } from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'

// Résout le binaire ffmpeg : embarqué (packaging J4) sinon 'ffmpeg' du PATH.
export function ffmpegPath() {
  const bundled = join(process.resourcesPath || '', 'bin', 'ffmpeg.exe')
  if (process.resourcesPath && fs.existsSync(bundled)) return bundled
  return 'ffmpeg'
}

// Lance ffmpeg et résout à la fin (code 0). stderr accumulé pour diagnostic.
export function runFfmpeg(args, { onStderr } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath(), args, { windowsHide: true })
    let err = ''
    proc.stderr.on('data', (d) => {
      const s = d.toString()
      err += s
      if (err.length > 8000) err = err.slice(-8000)
      onStderr?.(s)
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited ${code}: ${err.slice(-600)}`))
    })
  })
}

// Liste les périphériques audio DirectShow (dshow) pour le sélecteur micro.
export function listAudioDevices() {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath(), ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'], { windowsHide: true })
    let out = ''
    proc.stderr.on('data', (d) => (out += d.toString()))
    proc.on('error', () => resolve([]))
    proc.on('close', () => {
      const names = []
      const re = /"([^"]+)"\s*\(audio\)/g
      let m
      while ((m = re.exec(out))) names.push(m[1])
      resolve(names)
    })
  })
}

export const APP_TMP = () => app.getPath('temp')

// Durée d'un média (secondes) via ffprobe ; 0 si indéterminé.
export function probeDuration(file) {
  return new Promise((resolve) => {
    const bin = ffmpegPath().replace(/ffmpeg(\.exe)?$/i, (m, ext) => 'ffprobe' + (ext || ''))
    const proc = spawn(bin, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], { windowsHide: true })
    let out = ''
    proc.stdout.on('data', (d) => (out += d.toString()))
    proc.on('error', () => resolve(0))
    proc.on('close', () => resolve(Math.round(parseFloat(out.trim()) || 0)))
  })
}

// Existence d'une piste audio dans un média.
export function hasAudioStream(file) {
  return new Promise((resolve) => {
    const bin = ffmpegPath().replace(/ffmpeg(\.exe)?$/i, (m, ext) => 'ffprobe' + (ext || ''))
    const proc = spawn(bin, ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file], { windowsHide: true })
    let out = ''
    proc.stdout.on('data', (d) => (out += d.toString()))
    proc.on('error', () => resolve(false))
    proc.on('close', () => resolve(out.trim().length > 0))
  })
}
