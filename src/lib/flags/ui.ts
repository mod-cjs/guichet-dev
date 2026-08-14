// GUIC-706 — Filtrage des navigations — module PUR, importable côté client.
//
// Aucun import serveur ici : ces fonctions sont appelées depuis des composants client
// ('use client'). Le calcul des masques vit dans `ui-server.ts` — l'y laisser ferait
// entrer Prisma et ioredis dans le bundle navigateur, et le build échoue alors sur
// « Module not found: Can't resolve 'dns' ».
//
// POURQUOI PAR `href` ET NON PAR IDENTIFIANT. Les neuf barres de navigation ont des formes
// hétérogènes : les barres latérales portent des `id`, les bottom-navs raisonnent en liens
// seuls, le header public en tableaux distincts. Filtrer par lien évite d'instrumenter
// neuf fichiers — mais surtout, la navigation et le gate tranchent alors avec la MÊME
// règle : un item ne peut pas rester visible alors que sa route répond 404.
//
// `uiIds` reste réservé aux affordances SANS lien — onglets internes, sections titrées,
// puces de filtre — traitées au lot 5.

import { flagForPath } from './catalog'

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
