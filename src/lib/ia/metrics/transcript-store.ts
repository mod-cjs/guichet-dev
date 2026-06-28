// Capture durable du transcript Yaye (GUIC-435 — option A).
// Persiste le texte PSEUDONYMISÉ des tours (web ET WhatsApp, via le champ `canal`)
// pour rendre les conversations jugeables par le juge LLM (couche 3). Sans capture,
// on ne stocke que des longueurs et le juge n'a presque rien à noter.
//
// ⚠️ Gardé par le flag `YAYE_PERSIST_WEB_TRANSCRIPT` (défaut OFF) : opt-in explicite,
//    posture CDP par défaut inchangée (vaut pour les deux canaux).
// ⚠️ CDP : pseudonymisation AVANT écriture + purge au droit à l'oubli (cascade cjs_uid).
// ⚠️ FAIL-SOFT : ne lève jamais — n'interrompt pas la conversation.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { pseudonymizeText } from './pseudonymize'
import type { CanalAgent } from '@prisma/client'

/** La capture est-elle activée ? (flag d'env, opt-in). */
export function isWebTranscriptEnabled(): boolean {
  return process.env.YAYE_PERSIST_WEB_TRANSCRIPT === 'true'
}

export interface WebTurnInput {
  sessionId: string
  cjsUid?: string | null
  tourIndex: number
  userText: string
  assistantText: string
  canal?: CanalAgent
}

/**
 * Persiste un tour (texte pseudonymisé). No-op si le flag est désactivé.
 * Ne lève jamais.
 */
export async function recordWebTurn(input: WebTurnInput): Promise<void> {
  if (!isWebTranscriptEnabled()) return
  try {
    await prisma.yayeTranscriptTurn.create({
      data: {
        sessionId: input.sessionId,
        cjsUid: input.cjsUid ?? null,
        canal: input.canal ?? 'web',
        tourIndex: input.tourIndex,
        userText: pseudonymizeText(input.userText).slice(0, 4096),
        assistantText: pseudonymizeText(input.assistantText).slice(0, 4096),
      },
    })
  } catch (err) {
    logger.warn('[yaye-transcript] écriture échouée', { session: input.sessionId, err: String(err) })
  }
}
