// Journaliseur de l'agent Yaye → table `agent_logs` (M12, GUIC-259).
// Trace TECHNIQUE par événement (distincte du transcript ConversationWhatsApp/MessageWhatsApp).
// Spec : .agent_context/specs/yaye/06-agent-logs-tracabilite.md
//
// ⚠️ Invariant : la journalisation est FAIL-SOFT — une erreur d'écriture ne doit
// jamais interrompre la conversation. On log un warning et on continue.
// ⚠️ CDP (doc 07/10) : `payload` peut contenir des PII (message brut) → à minimiser
// côté appelant et à inclure dans le droit à l'oubli.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { CanalAgent, StatutAgent, TypeEvenementAgent } from '@prisma/client'
import type { Prisma } from '@prisma/client'

export interface AgentLogInput {
  sessionId: string
  cjsUid?: string | null
  role?: string | null
  centreId?: string | null
  canal: CanalAgent
  typeEvenement: TypeEvenementAgent
  toolCalled?: string | null
  payload?: Prisma.InputJsonValue
  cypherQuery?: string | null
  nodesReturned?: Prisma.InputJsonValue
  formatCanal?: string | null
  dureeMs?: number | null
  statut?: StatutAgent
}

/**
 * Écrit un événement dans `agent_logs` au moment exact où il se produit.
 * Ne lève jamais : en cas d'échec d'écriture, log un warning et retourne.
 */
export async function logAgentEvent(input: AgentLogInput): Promise<void> {
  try {
    await prisma.agentLog.create({
      data: {
        sessionId:     input.sessionId,
        cjsUid:        input.cjsUid ?? null,
        role:          input.role ?? null,
        centreId:      input.centreId ?? null,
        canal:         input.canal,
        tsMs:          BigInt(Date.now()),
        typeEvenement: input.typeEvenement,
        toolCalled:    input.toolCalled ?? null,
        payload:       input.payload,
        cypherQuery:   input.cypherQuery ?? null,
        nodesReturned: input.nodesReturned,
        formatCanal:   input.formatCanal ?? null,
        dureeMs:       input.dureeMs ?? null,
        statut:        input.statut ?? 'succes',
      },
    })
  } catch (err) {
    // Fail-soft : ne jamais casser la conversation pour un échec de log.
    logger.warn('[agent-logs] écriture échouée', { event: input.typeEvenement, err: String(err) })
  }
}
