import { sanitizeRichHtml } from '@/lib/sanitize-html'

/**
 * GUIC-508/506/509 — Sanitisation des champs riches d'une opportunité à l'écriture.
 *
 * Seuls les corps rédigés à l'éditeur riche sont assainis : `description` et les
 * sections `mission` / `profilRecherche` / `conditions`. Les champs structurés
 * (titre, slug, domaine, région, deadline, compétences…) qui alimentent le
 * Knowledge Graph ne sont PAS touchés — la séparation corps riche / structuré
 * est préservée (on n'aplatit pas le structuré dans du HTML).
 *
 * Générique : conserve le type d'entrée, ne modifie que les clés riches présentes.
 * Une section explicitement `null` (vidée) reste `null` ; une section absente reste absente.
 */
const RICH_FIELDS = ['description', 'mission', 'profilRecherche', 'conditions'] as const

export function sanitizeOpportuniteRichFields<
  T extends Record<string, unknown>,
>(base: T): T {
  const out = { ...base }
  for (const key of RICH_FIELDS) {
    if (!(key in out)) continue
    const value = out[key]
    if (typeof value === 'string') {
      ;(out as Record<string, unknown>)[key] = sanitizeRichHtml(value)
    }
    // null / undefined : laissés tels quels (section vidée ou absente).
  }
  return out
}
