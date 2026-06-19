import { join } from 'node:path'
import fs from 'node:fs'
import { sessionDir } from './sessions/store.js'
import { runFfmpeg } from './ffmpeg.js'

// Extrait une vignette JPG au timecode `tc` (secondes) de la vidéo de la session.
// Renvoie le chemin du fichier, ou null si indisponible.
export async function grabFrame(sessionId, tc, outName) {
  const dir = sessionDir(sessionId)
  const video = join(dir, 'session.mp4')
  if (!fs.existsSync(video)) return null
  const framesDir = join(dir, 'frames')
  fs.mkdirSync(framesDir, { recursive: true })
  const out = join(framesDir, outName)
  try {
    // -ss avant -i : seek rapide ; scale 480px de large pour des vignettes légères.
    await runFfmpeg(['-y', '-ss', String(Math.max(0, Number(tc) || 0)), '-i', video, '-frames:v', '1', '-q:v', '3', '-vf', 'scale=480:-2', out])
    return fs.existsSync(out) ? out : null
  } catch {
    return null
  }
}
