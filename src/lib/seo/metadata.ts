import type { Metadata } from 'next'

/**
 * Fragment de métadonnées canonical auto-référentiel (GUIC-25 / M7 SEO).
 *
 * À étaler dans un objet `Metadata` de page : `{ ...withCanonical('/legal/cgu') }`.
 * Le chemin est relatif — `metadataBase` (root layout) le résout en URL absolue.
 * Centralise le boilerplate `alternates.canonical` répété sur les pages publiques.
 */
export function withCanonical(path: string): Pick<Metadata, 'alternates'> {
  return { alternates: { canonical: path } }
}
