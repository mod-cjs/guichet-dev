// GUIC-706 — Filtrage des navigations.
//
// POURQUOI PAR `href` ET NON PAR IDENTIFIANT. Les neuf barres de navigation ont des formes
// hétérogènes : les barres latérales portent des `id`, les bottom-navs raisonnent en liens
// seuls, le header public en tableaux distincts. Filtrer par lien évite d'instrumenter
// neuf fichiers — mais surtout, la navigation et le gate tranchent alors avec la MÊME
// règle : un item ne peut pas rester visible alors que sa route répond 404.
//
// `uiIds` reste réservé aux affordances SANS lien — onglets internes, sections titrées,
// puces de filtre — traitées au lot 5.

import { getFlags } from '@/lib/flags'
import { logger } from '@/lib/logger'
import { FEATURE_FLAGS, flagForPath, resolveAudience } from './catalog'

/**
 * Clés masquées **pour ce visiteur**. Calculée côté serveur puis passée aux composants de
 * navigation : les filtrer côté client produirait un affichage complet le temps du premier
 * rendu, soit exactement la trace qu'on retire.
 *
 * Rend une liste vide plutôt que d'échouer si l'état est illisible — perdre son menu est
 * pire pour l'utilisateur que voir un lien qui mène à un 404.
 */
export async function masquesUtilisateur(
  roles: readonly string[] | null | undefined,
): Promise<string[]> {
  const face = resolveAudience(roles)
  // L'administration voit la navigation entière : c'est ainsi qu'elle atteint ce qu'elle
  // prépare pendant que le module est fermé au public.
  if (face === 'admin') return []

  let flags: Record<string, boolean>
  try {
    flags = await getFlags()
  } catch (err) {
    logger.warn('[flags] navigation non filtrée, état illisible', { err: String(err) })
    return []
  }

  return FEATURE_FLAGS.filter((f) => flags[f.key] === false && f.closes.includes(face)).map(
    (f) => f.key,
  )
}

/**
 * Vrai si ce lien mène à une fonctionnalité masquée.
 *
 * Module pur, importable côté client : c'est ce qui permet aux barres de navigation de ne
 * recevoir qu'une liste de clés plutôt qu'une copie filtrée de leurs propres tableaux.
 */
export function lienMasque(href: string, masques: readonly string[]): boolean {
  if (masques.length === 0) return false
  // Les liens externes ne relèvent d'aucun flag (YEAH, e-learning).
  if (/^https?:\/\//.test(href)) return false
  // La barre latérale jeune pointe vers `/opportunites?type=Emploi` : sans découpe, le
  // rattachement échouerait et l'item resterait visible.
  const key = flagForPath(href.split('?')[0].split('#')[0])
  return key !== null && masques.includes(key)
}

interface SectionLike<I extends { href: string }> {
  title?: string
  items: I[]
}

/**
 * Filtre des sections de navigation en appliquant **la règle du conteneur** : une section
 * dont tous les items disparaissent est retirée AVEC SON TITRE.
 *
 * Un intitulé « Découvrir » suivi de rien ne cache pas l'absence, il la montre. Le
 * contenant est une trace au même titre que son contenu.
 */
export function filtrerSections<I extends { href: string }, S extends SectionLike<I>>(
  sections: readonly S[],
  masques: readonly string[],
): S[] {
  if (masques.length === 0) return [...sections]
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !lienMasque(i.href, masques)) }))
    .filter((s) => s.items.length > 0)
}
