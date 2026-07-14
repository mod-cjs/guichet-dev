// Transcript d'AFFICHAGE de Yaye — restaure la conversation VISIBLE d'une session à
// l'autre (rechargement de page, réouverture du drawer, bascule d'appareil).
//
// À NE PAS confondre avec :
//  - `context.ts` (`yaye:ctx:…`) : texte seul {role, content}, nourrit le LLM ;
//  - `metrics/transcript-store.ts` : verbatim PSEUDONYMISÉ, opt-in, pour le juge d'éval.
// Ici : les données PROPRES de l'utilisateur, en PLEINE FIDÉLITÉ (texte + blocks/cards),
// pour réafficher SON écran à l'identique. Même clé d'identité (`cjsUid`) et même TTL
// (7 j) que le contexte → mémoire et affichage expirent ensemble. Fail-soft partout.

import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import type { YayeBlock } from './blocks'

const PREFIX = 'yaye:view:'
const TTL = 7 * 24 * 3600 // 7 jours, rafraîchi à chaque écriture (aligné sur le contexte)
const MAX_MSGS = 40 // ~20 échanges affichés (borne coût/latence)

/** Un message d'affichage restaurable. L'assistant porte ses blocks (cards) + le suivi feedback. */
export type ViewTurn =
  | { role: 'user'; text: string; ts: number }
  | { role: 'assistant'; text: string; blocks: YayeBlock[]; sessionId: string; tourIndex: number; ts: number }

export function viewKey(cjsUid: string): string {
  return `${PREFIX}user:${cjsUid}`
}

/** Charge le transcript d'affichage d'un utilisateur ([] si absent ou erreur). Fail-soft. */
export async function loadViewTranscript(cjsUid: string): Promise<ViewTurn[]> {
  try {
    const raw = await redis.get(viewKey(cjsUid))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ViewTurn[]).slice(-MAX_MSGS) : []
  } catch (err) {
    logger.warn('[yaye-view] load échec', { err: String(err) })
    return []
  }
}

/**
 * Ajoute un tour (message user + réponse assistant avec ses blocks) au transcript
 * d'affichage, borné et avec TTL rafraîchi. Fail-soft (n'interrompt jamais la conversation).
 * `ts` = horodatage du tour (fourni par l'appelant, le même pour les deux messages).
 */
export async function appendViewTurn(
  cjsUid: string,
  userText: string,
  assistant: { text: string; blocks: YayeBlock[]; sessionId: string; tourIndex: number },
  ts: number,
): Promise<void> {
  try {
    const prev = await loadViewTranscript(cjsUid)
    const next: ViewTurn[] = [
      ...prev,
      { role: 'user' as const, text: userText, ts },
      {
        role: 'assistant' as const,
        text: assistant.text,
        blocks: assistant.blocks,
        sessionId: assistant.sessionId,
        tourIndex: assistant.tourIndex,
        ts,
      },
    ].slice(-MAX_MSGS)
    await redis.set(viewKey(cjsUid), JSON.stringify(next), 'EX', TTL)
  } catch (err) {
    logger.warn('[yaye-view] append échec', { err: String(err) })
  }
}

/** Efface le transcript d'affichage d'un utilisateur (droit à l'oubli CDP). Fail-soft. */
export async function purgeViewTranscript(cjsUid: string): Promise<void> {
  try {
    await redis.del(viewKey(cjsUid))
  } catch (err) {
    logger.warn('[yaye-view] purge échec', { err: String(err) })
  }
}
