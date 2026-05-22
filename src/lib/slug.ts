import { randomBytes } from 'crypto'

/**
 * Génération de slugs SEO pour les opportunités (GUIC-20).
 * La colonne `Opportunite.slug` est `VarChar(280)` ; on plafonne en deçà pour
 * laisser la place au suffixe anti-collision (`-` + 6 hexa).
 */

export const MAX_SLUG_LENGTH = 270
const SUFFIX_LENGTH = 6
const FALLBACK = 'opportunite'

/** Retire les tirets de début/fin éventuels laissés par une troncature. */
function trimHyphens(value: string): string {
  return value.replace(/^-+/, '').replace(/-+$/, '')
}

/**
 * Transforme un titre en slug : minuscules, sans accents, séparateurs unifiés.
 * Retombe sur `opportunite` si l'entrée ne produit aucun caractère exploitable.
 */
export function slugify(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritiques combinants
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')

  const slug = trimHyphens(base)
  if (!slug) return FALLBACK
  if (slug.length <= MAX_SLUG_LENGTH) return slug
  return trimHyphens(slug.slice(0, MAX_SLUG_LENGTH))
}

/**
 * Produit un slug unique : renvoie le slug de base s'il est libre, sinon ajoute
 * un suffixe hexadécimal court et réessaie jusqu'à trouver une valeur libre.
 *
 * @param isTaken prédicat de collision (lookup base ou en mémoire).
 */
export async function generateUniqueSlug(
  titre: string,
  isTaken: (slug: string) => boolean | Promise<boolean>
): Promise<string> {
  const base = slugify(titre)
  if (!(await isTaken(base))) return base

  // Réserve la place du suffixe : `-` + 6 hexa.
  const stem = trimHyphens(base.slice(0, MAX_SLUG_LENGTH - SUFFIX_LENGTH - 1))

  // Boucle bornée en pratique : 2^24 suffixes possibles.
  for (;;) {
    const suffix = randomBytes(3).toString('hex') // 6 caractères hexa
    const candidate = `${stem}-${suffix}`
    if (!(await isTaken(candidate))) return candidate
  }
}
