// GUIC-706 — Gardes des surfaces que le middleware ne couvre pas (lot 4).
//
// Le gate du lot 3 ferme les pages ET les routes d'API. Restent trois surfaces qui lui
// échappent par construction, et dont chacune appelle une réponse différente :
//
//   - SERVER ACTIONS — elles s'exécutent hors du chemin de la route appelante. On lève.
//   - TÂCHES PLANIFIÉES — exclues du gate : un 404 y compterait comme un échec
//     d'exécution et alerterait pour une fermeture voulue. Elles se court-circuitent.
//   - WEBHOOKS entrants — exclus pour la même raison en pire : un 404 fait retrier Meta et
//     le SSO en boucle. Ils répondent 200 et ignorent.
//
// Spec : `.agent_context/specs/GUIC-706-feature-flags.md` §3.4.

import { getSession } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { getFlags } from '@/lib/flags'
import { FEATURE_FLAGS, getFlagDef, resolveAudience } from './catalog'
import { recordFlagBlock } from './metrics'

/**
 * Erreur levée par `assertFlag`.
 *
 * Son message ne nomme JAMAIS la fonctionnalité : il peut remonter jusqu'à l'utilisateur
 * via une frontière d'erreur, et y mettre la clé du flag révélerait l'existence de ce
 * qu'on masque.
 */
export class FonctionnaliteMasqueeError extends Error {
  constructor() {
    super('Action indisponible.')
    this.name = 'FonctionnaliteMasqueeError'
  }
}

/**
 * Refuse une server action portant sur une fonctionnalité masquée pour l'appelant.
 *
 * À placer en tête d'action, à côté des gardes de rôle existantes. Les actions sont le
 * contournement documenté du dispositif : elles échappent au middleware ET à la
 * navigation, si bien qu'un masquage sans elles ne serait qu'un habillage.
 *
 * @throws FonctionnaliteMasqueeError
 */
export async function assertFlag(key: string): Promise<void> {
  // Défaut fermé : une faute de frappe dans un appelant ne doit pas ouvrir un accès.
  const def = getFlagDef(key)
  if (!def) throw new FonctionnaliteMasqueeError()

  let flags: Record<string, boolean>
  try {
    flags = await getFlags()
  } catch (err) {
    // Une panne d'infrastructure ne doit pas empêcher un utilisateur d'agir.
    logger.warn('[flags] garde d’action dégradée', { key, err: String(err) })
    return
  }

  if (flags[key] !== false) return

  const session = await getSession()
  const face = resolveAudience(session?.roles)
  if (face === 'admin') return
  if (!def.closes.includes(face)) return

  await recordFlagBlock(key)
  throw new FonctionnaliteMasqueeError()
}

/**
 * Vrai si cette tâche planifiée doit être court-circuitée.
 *
 * Les tâches d'ENTRETIEN (`cronsEntretien`) continuent de tourner même flag masqué : elles
 * préparent la donnée pour l'ouverture, et les couper créerait un arriéré à rattraper au
 * pire moment, celui où l'on rouvre.
 *
 * @param cronPath chemin tel qu'écrit dans `vercel.json`
 */
export async function cronCourtCircuite(cronPath: string): Promise<boolean> {
  const def = FEATURE_FLAGS.find((f) => f.crons.includes(cronPath))
  if (!def) return false

  try {
    const flags = await getFlags()
    return flags[def.key] === false
  } catch (err) {
    // Dans le doute on laisse tourner : une tâche sautée laisse un trou dans la donnée,
    // une tâche de trop ne fait que du travail inutile.
    logger.warn('[flags] état illisible, tâche laissée active', { cronPath, err: String(err) })
    return false
  }
}

/**
 * Vrai si ce webhook doit être ignoré — l'appelant répond alors **200** sans traiter.
 *
 * Ne consulte jamais la session : Meta et le SSO appellent sans cookie, et résoudre une
 * audience n'aurait ici aucun sens.
 */
export async function webhookIgnore(key: string): Promise<boolean> {
  const def = getFlagDef(key)
  if (!def) return false

  try {
    const flags = await getFlags()
    if (flags[key] !== false) return false
  } catch (err) {
    // Mieux vaut traiter un message de trop que perdre définitivement un événement
    // entrant : l'émetteur ne le rejouera pas indéfiniment.
    logger.warn('[flags] état illisible, webhook traité', { key, err: String(err) })
    return false
  }

  await recordFlagBlock(key)
  return true
}
