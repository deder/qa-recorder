// Design tokens — source de vérité : QA Recorder.dc.html

export const C = {
  navy: '#000054',
  navyHover: '#00003a',
  blue: '#0C8CE9',
  blueDark: '#0862A3',
  green: '#47B375',
  greenDark: '#317D51',
  red: '#E64C35',
  redHover: '#CC4330',
  amber: '#ED6C02',
  bg: '#FAFBFB',
  panel: '#FFFFFF',
  border: '#E5E7EB',
  borderInput: '#E0E0E0',
  text: '#000054',
  text2: '#595987',
  text3: '#949DB2',
  text4: '#C0C3CE',
  hover: '#F9FAFB',
  chipGrey: '#F3F4F6',
}

export const CATS = {
  manquant: { label: 'Manquant', full: 'Élément manquant', color: '#ED6C02', bg: '#FFF4E5' },
  fonctionnel: { label: 'Fonctionnel', full: 'Bug fonctionnel', color: '#E64C35', bg: '#FDECEA' },
  affichage: { label: 'Affichage', full: 'Affichage / UI', color: '#0C8CE9', bg: '#E5F2FD' },
  libelle: { label: 'Libellé', full: 'Libellé / Texte', color: '#8218E2', bg: '#EEE5FF' },
  performance: { label: 'Performance', full: 'Performance', color: '#E0398A', bg: '#FCE4F1' },
  ux: { label: 'UX', full: 'UX / Parcours', color: '#03B2BD', bg: '#E0F7F8' },
}
export const CAT_ORDER = ['manquant', 'fonctionnel', 'affichage', 'libelle', 'performance', 'ux']

export const SEVS = {
  bloquant: { label: 'Bloquant', color: '#E64C35', bg: '#FDECEA', rank: 3 },
  majeur: { label: 'Majeur', color: '#ED6C02', bg: '#FFF4E5', rank: 2 },
  mineur: { label: 'Mineur', color: '#949DB2', bg: '#F3F4F6', rank: 1 },
}
export const SEV_ORDER = ['bloquant', 'majeur', 'mineur']

export const STATUSES = {
  'a-corriger': { label: 'À corriger', color: '#595987', bg: '#F3F4F6' },
  'en-cours': { label: 'En cours', color: '#0862A3', bg: '#E5F2FD' },
  corrige: { label: 'Corrigé', color: '#317D51', bg: '#E8F5EC' },
  verifie: { label: 'Vérifié', color: '#03808A', bg: '#E0F7F8' },
  rejete: { label: 'Rejeté', color: '#A13525', bg: '#FBEAE7' },
}
export const STATUS_ORDER = ['a-corriger', 'en-cours', 'corrige', 'verifie', 'rejete']
// Statuts considérés comme "corrigés" pour le calcul d'avancement
export const FIXED_STATUSES = ['corrige', 'verifie']

export const PROC_STEPS = [
  'Finalisation de l’enregistrement',
  'Conversion en MP4',
  'Transcription (Whisper)',
  'Analyse des bugs (IA)',
]
