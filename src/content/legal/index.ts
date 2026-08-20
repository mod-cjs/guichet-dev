/**
 * GUIC-605 — Registre des documents légaux.
 *
 * Source unique pour les pages `/legal/*` **et** pour les liens du Footer :
 * un document retiré d'ici disparaît du pied de page au lieu d'y laisser un
 * lien mort. C'est la régression d'origine — les 3 liens du Footer pointaient
 * vers des dossiers vides, donc des 404 en production.
 */
import type { DocumentLegal } from './types'
import { CGU } from './cgu'
import { COOKIES } from './cookies'
import { CONFIDENTIALITE } from './confidentialite'
import { INFORMATIONS_COLLECTE } from './informations-collecte'
import { MENTIONS_LEGALES } from './mentions-legales'
import { VOS_DROITS } from './vos-droits'

export const DOCUMENTS_LEGAUX: DocumentLegal[] = [
  CONFIDENTIALITE,
  INFORMATIONS_COLLECTE,
  VOS_DROITS,
  CGU,
  COOKIES,
  MENTIONS_LEGALES,
]

/** Libellés courts du pied de page, dans l'ordre d'affichage. */
export const LIENS_FOOTER_LEGAUX: { slug: string; libelle: string }[] = [
  { slug: CGU.slug, libelle: 'CGU' },
  { slug: CONFIDENTIALITE.slug, libelle: 'Confidentialité' },
  { slug: INFORMATIONS_COLLECTE.slug, libelle: 'Collecte des données' },
  { slug: VOS_DROITS.slug, libelle: 'Vos droits' },
  { slug: COOKIES.slug, libelle: 'Cookies' },
  { slug: MENTIONS_LEGALES.slug, libelle: 'Mentions légales' },
]

export function getDocumentLegal(slug: string): DocumentLegal | undefined {
  return DOCUMENTS_LEGAUX.find((doc) => doc.slug === slug)
}

export { CGU, CONFIDENTIALITE, COOKIES, INFORMATIONS_COLLECTE, MENTIONS_LEGALES, VOS_DROITS }
export * from './contact'
export * from './droits'
export type { BlocLegal, DocumentLegal, SectionLegale } from './types'
