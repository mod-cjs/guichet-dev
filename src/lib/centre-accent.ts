/**
 * Couleur « letterhead » d'un centre (GUIC-682), dérivée déterministiquement de
 * la région. Réutilise les paires de tokens sémantiques existantes (soft = tint
 * d'en-tête, ink = pastille) — déjà theme-aware (surchargées dans le scope
 * `[data-admin-theme="dark"]`). Aucun nouveau token, aucune valeur hex.
 */

export interface CentreAccent {
  /** Token de fond (tint) pour l'en-tête. */
  soft: string
  /** Token d'encre/pastille. */
  ink: string
}

const ACCENTS: CentreAccent[] = [
  { soft: '--gj-teal-soft', ink: '--gj-teal-deep' },
  { soft: '--gj-blue-soft', ink: '--gj-blue-ink' },
  { soft: '--gj-green-soft', ink: '--gj-green-ink' },
  { soft: '--gj-yellow-soft', ink: '--gj-yellow-ink' },
]

export const CENTRE_ACCENT_COUNT = ACCENTS.length

function hash(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h
}

/** Accent stable pour une région (ou tout seed). */
export function centreAccent(seed: string): CentreAccent {
  return ACCENTS[hash(seed) % ACCENTS.length]
}
