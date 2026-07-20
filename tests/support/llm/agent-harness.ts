// Harnais de test de l'agent Yaye (Lot 1, spec yaye-ats-tests-v4).
// Fournit : le contexte d'appel par défaut, un collecteur de flux SSE, et un
// constructeur de registre d'outils factices (execute = jest.fn() par outil).

import type { AgentStreamEvent, RunAgentParams } from '@/lib/ia/agent'
import type { YayeBlock } from '@/lib/ia/blocks'

/** Paramètres d'appel par défaut (jeune bénéficiaire, canal web). */
export const DEFAULT_BASE: Omit<RunAgentParams, 'message'> = {
  cjsUid: 'u-1',
  roles: ['beneficiaire'],
  sessionId: 's-1',
  canal: 'web',
}

/** Draine un flux `streamAgent` en un tableau d'événements. */
export async function collectStream(gen: AsyncGenerator<AgentStreamEvent>): Promise<AgentStreamEvent[]> {
  const out: AgentStreamEvent[] = []
  for await (const e of gen) out.push(e)
  return out
}

/** Concatène le texte des événements `token` d'un flux. */
export function streamedText(events: AgentStreamEvent[]): string {
  return events.filter((e) => e.type === 'token').map((e) => (e.type === 'token' ? e.text : '')).join('')
}

/** Résultat d'un outil factice (forme attendue par `executeToolCall`). */
export interface FakeToolResult {
  ok: boolean
  data?: unknown
  error?: string
  block?: YayeBlock
  graph?: { template: string; nodesReturned: number }
}

/** Définition d'outil minimale (schéma vide) pour `TOOL_DEFINITIONS`. */
export function toolDef(name: string) {
  return { type: 'function', function: { name, description: '', parameters: { type: 'object', properties: {} } } }
}
