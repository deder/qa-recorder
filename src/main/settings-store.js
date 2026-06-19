import { app } from 'electron'
import { join } from 'node:path'
import fs from 'node:fs'

const FILE = () => join(app.getPath('userData'), 'settings.json')

function defaults() {
  return {
    storageDir: join(app.getPath('userData'), 'sessions'),
    openrouterKey: '',
    analysisModel: 'anthropic/claude-sonnet-4.5',
    transcriptionModel: 'large-v3',
    resolution: '1920 × 1080',
    fps: '30 fps',
    computeMode: 'auto', // auto | gpu | cpu
    // Intégration Notion (jalon tickets). databaseId pré-rempli sur la base "🐛 QA Recette – Suivi des problèmes".
    notionToken: '',
    notionDatabaseId: '3f0635db-81b5-4d38-8cf4-2f637e6a53c5',
  }
}

// Ids de modèles OpenRouter obsolètes -> remplacement valide.
const DEPRECATED_MODELS = {
  'anthropic/claude-3.5-sonnet': 'anthropic/claude-sonnet-4.5',
  'anthropic/claude-3.7-sonnet': 'anthropic/claude-sonnet-4.5',
  'Analyse — qualité élevée': 'anthropic/claude-sonnet-4.5',
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
  if (DEPRECATED_MODELS[cache.analysisModel]) cache.analysisModel = DEPRECATED_MODELS[cache.analysisModel]
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
