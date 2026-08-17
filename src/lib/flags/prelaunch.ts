// GUIC-706 — Checklist de pré-ouverture.
//
// L'ouverture est le geste le plus risqué du dispositif, et celui auquel on pense le
// moins. Un module resté masqué des semaines s'ouvre sur des tâches jamais exécutées : les
// recommandations n'ont rien précalculé, le graphe n'a rien projeté. L'utilisateur
// découvre un module vide et n'y revient pas — un lancement raté ne se rattrape pas,
// l'attention ne se redonne pas.
//
// La checklist INFORME, elle ne conditionne pas. Ouvrir malgré un avertissement reste
// possible ; ce qu'on interdit, c'est de le faire sans le savoir.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getFlagDef } from './catalog'

export interface Checklist {
  /** Tâches planifiées à l'arrêt pendant le masquage — à préchauffer avant d'ouvrir. */
  crons: string[]
  /** Volume de contenu publié, quand le module en a. `null` si la notion n'a pas de sens. */
  contenu: number | null
  /** Ce que l'administrateur doit savoir avant de confirmer. Jamais bloquant. */
  avertissements: string[]
}

/**
 * Modèle Prisma porteur du contenu d'un module — celui dont le vide se verrait.
 *
 * Volontairement partiel : la plupart des fonctionnalités n'ont pas de « contenu » à
 * compter, et inventer une mesure pour toutes produirait des avertissements sans objet.
 */
const CONTENU_PAR_FLAG: Record<string, string> = {
  'm5.agenda': 'evenement',
  'm6.ressources': 'ressource',
  'm3.opportunites': 'opportunite',
  'm4.centres': 'centre',
  'm4.bibliotheque': 'exemplaire',
}

async function compteContenu(key: string): Promise<number | null> {
  const modele = CONTENU_PAR_FLAG[key]
  if (!modele) return null
  try {
    const client = prisma as unknown as Record<string, { count?: () => Promise<number> }>
    const m = client[modele]
    return m?.count ? await m.count() : null
  } catch (err) {
    logger.warn('[flags] volume de contenu indisponible', { key, err: String(err) })
    return null
  }
}

/**
 * Ce qu'il faut savoir avant d'ouvrir cette fonctionnalité.
 *
 * @param flags état courant, pour signaler une dépendance encore masquée. Optionnel : la
 *   checklist reste utile sans lui.
 */
export async function checklistOuverture(
  key: string,
  flags?: Record<string, boolean>,
): Promise<Checklist> {
  const def = getFlagDef(key)
  if (!def) return { crons: [], contenu: null, avertissements: [] }

  const avertissements: string[] = []

  // Les tâches à l'arrêt sont la cause la plus fréquente d'une ouverture sur du vide :
  // elles préparent la donnée, et personne ne pense à elles au moment d'ouvrir.
  if (def.crons.length > 0) {
    avertissements.push(
      `${def.crons.length} tâche${def.crons.length > 1 ? 's' : ''} planifiée${def.crons.length > 1 ? 's' : ''} à l’arrêt — préchauffer avant d’ouvrir.`,
    )
  }

  const contenu = await compteContenu(key)
  if (contenu === 0) {
    // Le pire scénario d'ouverture : la fonctionnalité marche, elle est simplement vide,
    // et l'utilisateur en conclut qu'elle ne sert à rien.
    avertissements.push('Aucun contenu publié : les utilisateurs ouvriront sur une page vide.')
  }

  if (flags) {
    // Le service refusera de toute façon ; l'annoncer ici évite un aller-retour et dit
    // quoi ouvrir d'abord.
    const masquees = def.dependsOn.filter((d) => flags[d] === false)
    if (masquees.length > 0) {
      avertissements.push(`À ouvrir d’abord : ${masquees.join(', ')}.`)
    }
  }

  return { crons: def.crons, contenu, avertissements }
}
