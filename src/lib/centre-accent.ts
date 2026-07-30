/**
 * Couleur « letterhead » d'un centre (GUIC-682 / 687), déterministe par région.
 * Palette REPRODUITE À L'IDENTIQUE de la maquette (6 teintes cyclées) — triplets
 * RGB : tint d'en-tête via `rgba(var(--cc), .13)`, avatar/pastille via `rgb(var(--cc))`.
 */

/** Palette maquette (ordre = cycle appliqué aux centres). */
const PALETTE: string[] = [
  '244,185,48',   // doré
  '95,160,255',   // bleu
  '40,196,176',   // teal
  '59,214,139',   // vert
  '196,160,255',  // violet
  '255,138,107',  // orange
]

export const CENTRE_ACCENT_COUNT = PALETTE.length

function hash(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h
}

/** Triplet RGB (ex. "244,185,48") stable pour une région/seed. */
export function centreRgb(seed: string): string {
  return PALETTE[hash(seed) % PALETTE.length]
}
