// Peuple resources/ pour l'embarquement (electron-builder extraResources).
// - ffmpeg.exe + ffprobe.exe : copiés depuis l'installation locale (ou le PATH) -> resources/bin
// - sidecar Python : copié -> resources/py (fallback faster-whisper)
// - modèle GGUF whisper.cpp : téléchargé sur demande -> resources/models  (--model large-v3-turbo-q5_0)
// - serveur whisper.cpp CPU  : --whisper-cpu-zip <url>  -> resources/whisper-cpu
// - serveur whisper.cpp CUDA : --whisper-cuda-zip <url> -> resources/whisper-cuda
// Les deux builds (CPU/CUDA) ont des DLLs incompatibles -> dossiers SÉPARÉS. Le runtime
// (whisper-service.js) choisit le dossier au démarrage selon la présence d'un GPU NVIDIA.
import { spawnSync } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import fs from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RES = join(ROOT, 'resources')
const BIN = join(RES, 'bin')
const MODELS = join(RES, 'models')
const PY = join(RES, 'py')
const WHISPER_CPU = join(RES, 'whisper-cpu')
const WHISPER_CUDA = join(RES, 'whisper-cuda')
for (const d of [BIN, MODELS, PY]) fs.mkdirSync(d, { recursive: true })

const args = process.argv.slice(2)
const argVal = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null }

function resolveExe(name) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf-8' })
  if (r.status !== 0) return null
  const p = r.stdout.split(/\r?\n/).find(Boolean)
  try { return fs.realpathSync(p) } catch { return p }
}

function copyExe(name) {
  const src = resolveExe(name)
  if (!src || !fs.existsSync(src)) { console.warn(`! ${name} introuvable sur le PATH — ignoré`); return }
  const dest = join(BIN, `${name}.exe`)
  fs.copyFileSync(src, dest)
  console.log(`✓ ${name} -> resources/bin (${Math.round(fs.statSync(dest).size / 1e6)} Mo)`)
}

function copyPy() {
  const src = join(ROOT, 'src', 'main', 'py', 'transcribe_fw.py')
  if (fs.existsSync(src)) { fs.copyFileSync(src, join(PY, 'transcribe_fw.py')); console.log('✓ sidecar python -> resources/py') }
}

async function download(url, dest) {
  console.log(`… téléchargement ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  await new Promise((resolve, reject) => {
    const out = createWriteStream(dest)
    Readable.fromWeb(res.body).pipe(out)
    out.on('finish', resolve)
    out.on('error', reject)
  })
  console.log(`✓ ${dest} (${Math.round(fs.statSync(dest).size / 1e6)} Mo)`)
}

// Aplatit récursivement les .exe/.dll trouvés vers destDir.
function flattenBinaries(fromDir, destDir) {
  for (const e of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const p = join(fromDir, e.name)
    if (e.isDirectory()) flattenBinaries(p, destDir)
    else if (/\.(exe|dll)$/i.test(e.name)) fs.copyFileSync(p, join(destDir, e.name))
  }
}

// Normalise les noms attendus par le runtime dans un dossier whisper.
function normalizeWhisper(dir) {
  if (!fs.existsSync(join(dir, 'whisper-cli.exe')) && fs.existsSync(join(dir, 'main.exe'))) {
    fs.copyFileSync(join(dir, 'main.exe'), join(dir, 'whisper-cli.exe'))
  }
  if (!fs.existsSync(join(dir, 'whisper-server.exe')) && fs.existsSync(join(dir, 'server.exe'))) {
    fs.copyFileSync(join(dir, 'server.exe'), join(dir, 'whisper-server.exe'))
  }
}

// Télécharge un zip de release whisper.cpp et l'extrait (à plat) dans destDir.
async function embedWhisperZip(url, destDir, label) {
  fs.rmSync(destDir, { recursive: true, force: true }) // repart propre (évite les builds mélangés)
  fs.mkdirSync(destDir, { recursive: true })
  const tmp = join(destDir, '_tmp')
  fs.mkdirSync(tmp, { recursive: true })
  const zip = join(tmp, 'whisper.zip')
  await download(url, zip)
  // Extraction du .zip. Sous Windows : Expand-Archive (PowerShell), fiable quel que soit le
  // `tar` du PATH (bsdtar prend "D:\" pour un hôte distant, GNU tar ne lit pas les zip).
  let r
  if (process.platform === 'win32') {
    r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', "Expand-Archive -LiteralPath 'whisper.zip' -DestinationPath '.' -Force"], { cwd: tmp, encoding: 'utf-8' })
  } else {
    r = spawnSync('tar', ['-xf', 'whisper.zip'], { cwd: tmp, encoding: 'utf-8' })
  }
  if (r.status !== 0) throw new Error('extraction échouée : ' + (r.stderr || r.error?.message || ''))
  flattenBinaries(tmp, destDir)
  fs.rmSync(tmp, { recursive: true, force: true })
  normalizeWhisper(destDir)
  console.log(`✓ whisper.cpp ${label} -> ${destDir.replace(ROOT, '.')}`)
}

function hasServer(dir) {
  return fs.existsSync(join(dir, 'whisper-server.exe'))
}

async function main() {
  copyExe('ffmpeg')
  copyExe('ffprobe')
  copyPy()

  const model = argVal('--model')
  if (model) {
    const dest = join(MODELS, `ggml-${model}.bin`)
    if (fs.existsSync(dest)) console.log(`= modèle déjà présent : ${dest}`)
    else await download(`https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${model}.bin`, dest)
  } else {
    console.log('· modèle Whisper non téléchargé (ajoute --model large-v3-turbo-q5_0 pour l’embarquer)')
  }

  const cpuZip = argVal('--whisper-cpu-zip')
  const cudaZip = argVal('--whisper-cuda-zip')
  if (cpuZip) await embedWhisperZip(cpuZip, WHISPER_CPU, 'CPU').catch((e) => console.warn('! whisper CPU :', e.message))
  if (cudaZip) await embedWhisperZip(cudaZip, WHISPER_CUDA, 'CUDA').catch((e) => console.warn('! whisper CUDA :', e.message))
  if (!cpuZip && !cudaZip) console.log('· serveurs whisper.cpp non (re)téléchargés (--whisper-cpu-zip / --whisper-cuda-zip)')

  const okCpu = hasServer(WHISPER_CPU)
  const okCuda = hasServer(WHISPER_CUDA)
  const hasModel = fs.existsSync(MODELS) && fs.readdirSync(MODELS).some((f) => /\.(bin|gguf)$/i.test(f))
  const ok = (okCpu || okCuda) && hasModel
  console.log(`\nTranscription hors-ligne embarquée : ${ok ? 'OUI ✓' : 'NON'}`)
  console.log(`  serveur CPU  : ${okCpu ? 'ok' : 'absent'}`)
  console.log(`  serveur CUDA : ${okCuda ? 'ok' : 'absent'} (GPU NVIDIA)`)
  console.log(`  modèle       : ${hasModel ? 'ok' : 'absent'}`)
  if (ok && !okCpu) console.log('  ⚠ Pas de build CPU : les machines sans NVIDIA n’auront pas de transcription autonome.')
  console.log('Prêt. `npm run pack` / `npm run dist` embarquera ces ressources.')
}

main().catch((e) => { console.error(e); process.exit(1) })
