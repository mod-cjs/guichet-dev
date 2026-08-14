// GUIC-706 — Comptage des accès refusés par un flag.
//
// POURQUOI COMPTER. Un module masqué est autrement un angle mort : rien ne dit si des
// utilisateurs butent dessus. Or un trafic significatif sur une fonctionnalité censée
// invisible ne signifie qu'une chose — un lien subsiste quelque part (§3.6). C'est le
// seul détecteur de fuite en production dont on dispose, et accessoirement le seul
// indicateur de demande avant d'ouvrir.
//
// Coût assumé : un INCR Redis sur un chemin déjà refusé, donc jamais sur le chemin
// nominal. La mesure ne doit jamais faire échouer la requête qu'elle observe : tout est
// fail-soft, dans les deux sens.

import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { getFlagDef } from './catalog'

/** Le préfixe global `guichet:` est appliqué par le client Redis (cf. `src/lib/redis.ts`). */
const cle = (key: string) => `flags:hits:${key}`

/** 30 jours : au-delà, le trafic d'une fermeture ancienne polluerait la lecture du moment. */
const RETENTION_S = 30 * 24 * 3600

/**
 * Enregistre un accès refusé. Ne rejette jamais, ne bloque rien.
 *
 * Une clé absente du catalogue n'est pas comptée : elle ne correspond à aucune
 * fonctionnalité, et l'accepter laisserait un appelant fautif créer des clés Redis.
 */
export async function recordFlagBlock(key: string): Promise<void> {
  if (!getFlagDef(key)) return
  try {
    await redis.incr(cle(key))
    await redis.expire(cle(key), RETENTION_S)
  } catch (err) {
    logger.warn('[flags] comptage du refus échoué', { key, err: String(err) })
  }
}

/**
 * Nombre d'accès refusés par flag sur la fenêtre de rétention.
 *
 * Rend des zéros plutôt qu'une erreur si Redis est muet : l'absence de mesure n'est pas
 * une raison de refuser d'afficher l'état des fonctionnalités.
 */
export async function getFlagHits(keys: readonly string[]): Promise<Record<string, number>> {
  if (keys.length === 0) return {}
  const out: Record<string, number> = {}
  try {
    const valeurs = await redis.mget(...keys.map(cle))
    keys.forEach((key, i) => {
      out[key] = Number(valeurs[i] ?? 0) || 0
    })
  } catch (err) {
    logger.warn('[flags] lecture des compteurs échouée', { err: String(err) })
    for (const key of keys) out[key] = 0
  }
  return out
}
