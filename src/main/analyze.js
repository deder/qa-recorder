// Étape Analyse. Implémentation réelle (OpenRouter) au jalon J3.
// Stub J2 : ne produit pas de bugs ; le pipeline retombe sur les bugs de démo.
export async function analyze(id, fromStart, ctx) {
  ctx?.emit?.(40)
  await new Promise((r) => setTimeout(r, 400))
  ctx?.emit?.(100)
}
