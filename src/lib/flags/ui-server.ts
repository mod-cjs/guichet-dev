// GUIC-706 — Calcul des masques, côté serveur uniquement.
//
// SÉPARÉ DE `ui.ts` À DESSEIN. `ui.ts` est importé par des composants CLIENT (barres
// latérales, bottom-navs, header). Y laisser cette fonction y faisait entrer `@/lib/flags`,
// donc Prisma et ioredis, donc `dns` — et le build échouait avec « Module not found:
// Can't resolve 'dns' ». La frontière n'est pas une préférence de style : elle est
// imposée par le graphe de dépendances.

import { getFlags } from '@/lib/flags'
import { logger } from '@/lib/logger'
import { FEATURE_FLAGS, resolveAudience } from './catalog'

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
 * Vrai si cette fonctionnalité est masquée pour ce visiteur.
 *
 * Destinée aux SURFACES D'INCIDENCE (§3.6 de la spec) : les endroits où un module se
 * montre depuis la page d'un AUTRE module — une section du tableau de bord, un encart de
 * la fiche centre, une carte de l'accueil. Fermer la route ne suffit pas, ces mentions
 * survivent et nomment ce qu'on masque.
 *
 * Règle d'usage : produire l'ABSENCE DE LA SECTION ENTIÈRE, jamais une section vide. Un
 * titre « Événements à venir » suivi de rien ne cache pas l'absence, il la montre.
 */
export async function estMasquee(
  key: string,
  roles: readonly string[] | null | undefined,
): Promise<boolean> {
  return (await masquesUtilisateur(roles)).includes(key)
}
