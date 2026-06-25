// Résumé borné des résultats d'outils (GUIC-435 — R1, Phase 1).
// Donne au juge LLM les DONNÉES réellement fournies par les outils, pour qu'il
// mesure la fidélité (anti-hallucination) au lieu de la deviner.
//
// ⚠️ CDP : on ne résume que des données MÉTIER (titres d'opportunités, compteurs,
// libellés d'action) — jamais le détail du profil/PII. Borné en longueur.

import type { YayeBlock } from '../blocks'

interface ToolResult {
  ok: boolean
  data?: unknown
  block?: YayeBlock
  error?: string
}

const MAX = 400

/** Produit un court résumé non-PII de ce qu'un outil a renvoyé. */
export function summarizeToolResult(name: string, result: ToolResult): string {
  if (!result.ok) return `échec: ${result.error ?? 'erreur'}`.slice(0, 200)

  const b = result.block
  if (b?.kind === 'opportunites') {
    const titres = b.items.map((i) => i.titre).filter(Boolean).slice(0, 6)
    return `${b.items.length} résultat(s)${titres.length ? ' : ' + titres.join(' · ') : ''}`.slice(0, MAX)
  }
  if (b?.kind === 'action') {
    return [b.title, b.subtitle].filter(Boolean).join(' — ').slice(0, MAX) || 'action proposée'
  }
  if (b?.kind === 'quick_replies') {
    return `options : ${b.replies.map((r) => r.label).slice(0, 6).join(', ')}`.slice(0, MAX)
  }
  // get_user_profile / get_realtime_data : ne PAS exposer les valeurs (PII / compteurs perso).
  // On ne signale que les champs présents, pas leur contenu.
  if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
    const keys = Object.keys(result.data as Record<string, unknown>).slice(0, 8)
    return `données fournies : {${keys.join(', ')}}`.slice(0, MAX)
  }
  return 'ok (aucune donnée structurée)'
}
