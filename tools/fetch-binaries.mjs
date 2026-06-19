// Peuple resources/{bin,models,py} pour l'embarquement (electron-builder extraResources).
// - ffmpeg.exe + ffprobe.exe : copiés depuis l'installation locale (ou le PATH).
// - sidecar Python : copié (fallback faster-whisper).
// - modèle GGUF whisper.cpp : téléchargé sur demande (gros) — `node tools/fetch-binaries.mjs --model large-v3-turbo`.
// - binaire whisper.cpp : `--whisper <url-zip>` (best-effort).
import { spawnSync } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import fs from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BIN = join(ROOT, 'resources', 'bin')
const MODELS = join(ROOT, 'resources', 'models')
const PY = join(ROOT, 'resources', 'py')
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
    console.log('· modèle Whisper non téléchargé (ajoute --model large-v3-turbo pour l’embarquer)')
  }

  const whisperZip = argVal('--whisper')
  if (whisperZip) await download(whisperZip, join(BIN, 'whisper-bin.zip')).catch((e) => console.warn('! whisper.cpp:', e.message))
  else console.log('· binaire whisper.cpp non téléchargé (ajoute --whisper <url-zip> ou place whisper-cli.exe dans resources/bin)')

  console.log('\nPrêt. `npm run dist` produira l’installeur avec ces ressources embarquées.')
}

main().catch((e) => { console.error(e); process.exit(1) })
