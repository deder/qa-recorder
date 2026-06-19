import { spawnSync } from 'node:child_process'
import { getSettings } from './settings-store.js'

let nvidiaCache = null

// Détecte un GPU NVIDIA utilisable (re-détecté à chaque lancement — cf. SPEC §2bis).
export function hasNvidiaGpu() {
  if (nvidiaCache !== null) return nvidiaCache
  try {
    const r = spawnSync('nvidia-smi', ['--query-gpu=name', '--format=csv,noheader'], { encoding: 'utf-8', windowsHide: true })
    nvidiaCache = r.status === 0 && /\S/.test(r.stdout || '')
  } catch {
    nvidiaCache = false
  }
  return nvidiaCache
}

// Plan de transcription selon le mode (Auto/GPU/CPU) et le GPU détecté.
export function transcriptionPlan() {
  const mode = getSettings().computeMode || 'auto'
  const gpu = mode === 'cpu' ? false : mode === 'gpu' ? true : hasNvidiaGpu()
  if (gpu) {
    return { device: 'cuda', compute: 'float16', model: 'large-v3' }
  }
  // CPU : modèle plus léger/rapide indispensable sur 30–60 min d'audio
  return { device: 'cpu', compute: 'int8', model: 'large-v3-turbo' }
}
