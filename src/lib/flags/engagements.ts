// GUIC-706 — Engagements en cours et fermeture progressive.
//
// Une réservation acceptée, un emprunt en cours, une candidature en instruction sont des
// engagements pris ENVERS l'utilisateur. Les rendre invisibles ne les annule pas : ça le
// prive du moyen de les honorer. Un jeune qui a un livre chez lui perdrait sa date de
// retour et passerait en retard sans le savoir.
//
// D'où deux fonctions aux replis OPPOSÉS, et c'est délibéré :
//   - le décompte informe une décision de l'administrateur → rend 0 en cas de panne,
//     son absence ne doit pas empêcher de décider ;
//   - le droit de passage ouvre une porte → refuse en cas de panne, laisser passer
//     rouvrirait la sortie au public qu'on masque.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getFlagDef } from './catalog'

/** Accès dynamique au modèle Prisma déclaré au catalogue (`engagements.model`). */
function modele(nom: string): { count: (args: unknown) => Promise<number> } | null {
  const client = prisma as unknown as Record<string, { count?: (args: unknown) => Promise<number> }>
  const m = client[nom]
  return m && typeof m.count === 'function' ? (m as { count: (a: unknown) => Promise<number> }) : null
}

/**
 * Nombre d'engagements encore actifs sur cette fonctionnalité — affiché à l'administrateur
 * avant qu'il ne confirme un masquage.
 *
 * Sans ce décompte, la bascule se fait à l'aveugle sur un module où des gens attendent
 * quelque chose.
 */
export async function compteEngagements(key: string): Promise<number> {
  const def = getFlagDef(key)
  if (!def || def.closeMode !== 'drain' || !def.engagements) return 0

  const m = modele(def.engagements.model)
  if (!m) return 0

  try {
    return await m.count({ where: { statut: { in: def.engagements.activeStates } } })
  } catch (err) {
    logger.warn('[flags] décompte des engagements indisponible', { key, err: String(err) })
    return 0
  }
}

/**
 * Vrai si CET utilisateur a un engagement en cours sur cette fonctionnalité — donc s'il
 * conserve l'accès à ses routes de sortie malgré le masquage.
 *
 * Le filtre par utilisateur n'est pas une optimisation : sans lui, n'importe qui passerait
 * dès qu'un engagement existe quelque part, et la sortie deviendrait une porte ouverte
 * plutôt qu'un droit personnel.
 */
export async function aUnEngagement(key: string, cjsUid: string | null | undefined): Promise<boolean> {
  if (!cjsUid) return false
  const def = getFlagDef(key)
  if (!def || def.closeMode !== 'drain' || !def.engagements) return false

  const m = modele(def.engagements.model)
  if (!m) return false

  try {
    const n = await m.count({
      where: { cjsUid, statut: { in: def.engagements.activeStates } },
    })
    return n > 0
  } catch (err) {
    // Repli FERMÉ, à l'inverse du décompte : une panne ne doit pas rouvrir la sortie à
    // tout le monde.
    logger.warn('[flags] engagement illisible, sortie refusée', { key, err: String(err) })
    return false
  }
}
