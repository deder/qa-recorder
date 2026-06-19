import { app } from 'electron'
import { join } from 'node:path'
import fs from 'node:fs'

const FILE = () => join(app.getPath('userData'), 'settings.json')

function defaults() {
  return {
    storageDir: join(app.getPath('userData'), 'sessions'),
    openrouterKey: '',
    analysisModel: 'anthropic/claude-3.5-sonnet',
    transcriptionModel: 'large-v3',
    resolution: '1920 × 1080',
    fps: '30 fps',
    computeMode: 'auto', // auto | gpu | cpu
  }
}

let cache = null

export function getSettings() {
  if (cache) return cache
  let data = {}
  try {
    data = JSON.parse(fs.readFileSync(FILE(), 'utf-8'))
  } catch {
    data = {}
  }
  cache = { ...defaults(), ...data }
  return cache
}

export function setSettings(partial) {
  const next = { ...getSettings(), ...partial }
  cache = next
  try {
    fs.writeFileSync(FILE(), JSON.stringify(next, null, 2), 'utf-8')
  } catch (e) {
    console.error('settings write failed', e)
  }
  return next
}
