// Étape Transcription. Implémentation réelle (whisper.cpp) au jalon J3.
// Stub J2 : ne produit pas de transcript ; l'analyse retombera sur les bugs de démo.
export async function transcribe(id, fromStart, ctx) {
  ctx?.emit?.(40)
  await new Promise((r) => setTimeout(r, 400))
  ctx?.emit?.(100)
}
