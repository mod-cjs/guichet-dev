// Aperçu du marché — recherche GLOBALE mémoïsée (GUIC-676).
//
// Emprunt ciblé au « Global Search » de GraphRAG : une question THÉMATIQUE (« quels
// secteurs recrutent à Thiès ? ») ne dépend d'AUCUNE personne. Elle est donc calculée
// une fois et servie à tout le monde — contrairement aux traversées égocentrées, qui
// sont bornées au cjsUid.
//
// ⚠️ INVARIANT CDP : la valeur mise en cache ne contient que des décomptes d'OFFRES.
// Aucun identifiant, aucun attribut de bénéficiaire → un cache partagé est sans risque.
// C'est précisément parce que la donnée est impersonnelle qu'on peut la partager.

import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { numEnv } from '../env'
import { getGraphPort } from './index'
import type { MarketCriteria, MarketOverview } from './port'

const PREFIX = 'yaye:marche:'
/** Le catalogue bouge à la journée, pas à la minute — 6 h suffisent. */
const TTL_MARCHE = numEnv('YAYE_MARCHE_TTL_S', 6 * 3600)

/** Clé de cache : le périmètre demandé (`*` = national / tous secteurs). */
export function marcheKey(criteria: MarketCriteria): string {
  return `${PREFIX}${criteria.region ?? '*'}:${criteria.domaine ?? '*'}`
}

/**
 * Aperçu du marché, mémoïsé. Fail-soft : toute erreur Redis → traversée directe.
 * Un aperçu VIDE n'est pas mis en cache (probablement un graphe en cours de
 * reconstruction — on ne veut pas figer « il n'y a rien » pendant 6 h).
 */
export async function loadOrBuildApercuMarche(criteria: MarketCriteria): Promise<MarketOverview> {
  const key = marcheKey(criteria)
  try {
    const cached = await redis.get(key)
    if (cached) return JSON.parse(cached) as MarketOverview
  } catch (err) {
    logger.warn('[marche] lecture cache échouée', { err: String(err) })
  }

  const apercu = await getGraphPort().apercuMarche(criteria)

  if (apercu.total > 0) {
    try {
      await redis.set(key, JSON.stringify(apercu), 'EX', TTL_MARCHE)
    } catch (err) {
      logger.warn('[marche] écriture cache échouée', { err: String(err) })
    }
  }
  return apercu
}
