# QA Session Recorder & Reviewer

Logiciel Windows (Electron + React) qui enregistre une session de test (écran + micro)
comme OBS, transcrit la voix (Whisper local), analyse la transcription (OpenRouter) pour
en extraire une liste de bugs horodatés, et permet de rejouer la session avec une liste
de bugs cliquable synchronisée.

> Conçu d'après le design `QA Recorder.dc.html` et la spec `../bug-review/SPEC_LOGICIEL.md`.

## Lancer en dev
```bash
npm install
npm run dev
```

## Build / packaging
```bash
npm run build       # compile main + preload + renderer
npm run fetch-bins  # embarque ffmpeg/ffprobe (+ modèle Whisper si --model)
npm run dist        # installeur Windows (NSIS) via electron-builder
```
`fetch-bins` peuple `resources/{bin,models,py}` (hors git). Pour embarquer le modèle
Whisper (offline) : `node tools/fetch-binaries.mjs --model large-v3-turbo`
(et `--whisper <url-zip>` pour le binaire whisper.cpp). Les binaires sont résolus en
production via `process.resourcesPath` (`src/main/ffmpeg.js`, `src/main/transcribe.js`).

## Écrans
- **Sessions** — liste (cartes/tableau), KPI, états Prête / En traitement (verrouillée) / Erreur.
- **Nouvelle session** — sources écran/micro, VU-mètre, bandeau « dites bug », REC / Pause / Reprendre / Arrêter.
- **Traitement** — pipeline en 4 étapes (Finalisation → Conversion → Transcription → Analyse), reprise après erreur.
- **Relecture** — lecteur vidéo + timeline de chapitrage + liste de bugs cliquable synchronisée, filtres, statuts.
- **Réglages** — clé OpenRouter, modèles, dossier de stockage, encodage, mode GPU/CPU.

## État d'avancement (jalons)
- ✅ **v1** — App complète + 5 écrans + Relecture 100 % fonctionnelle.
- ✅ **J2** — Capture ffmpeg réelle (gdigrab + dshow, segments → concat MKV → MP4 + audio).
- ✅ **J3** — Transcription (GPU/CPU, whisper.cpp ou faster-whisper) + analyse OpenRouter → `bugs.json`.
- ✅ **J4** — Packaging electron-builder (NSIS) + binaires embarqués + script `fetch-bins`.

## Architecture
- `src/main/` — process principal : fenêtre, protocole `media://`, IPC, store FS des
  sessions, enregistreur ffmpeg (`recorder.js`), pipeline (`pipeline.js`).
- `src/preload/` — pont `window.api` (contextBridge).
- `src/renderer/` — UI React (shell, écrans, composants de relecture).

Une session = un dossier dans le stockage configuré : `session.mkv` (master), `session.mp4`,
`audio.wav`, `transcript.*`, `bugs.json`, `meta.json` (machine à états du pipeline).

> Les vidéos/sessions ne sont pas versionnées (`.gitignore`).
