import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { runAgent } from '@/lib/ia/agent'
import { logAgentEvent } from '@/lib/ia/agent-logs'
import { loadContext, saveContext, TTL_WEB } from '@/lib/ia/context'
import type { YayeBlock } from '@/lib/ia/blocks'
import type { ApiResponse } from '@/types/api'

// M12 — IA · Agent Yaye (chat web) — Lot 0 (GUIC-259).
// Spec : .agent_context/specs/yaye/01-architecture-technique.md
// Réponse JSON pour le Lot 0 ; le streaming SSE viendra avec le formateur (Lot 5).

const BodySchema = z.object({
  message: z.string().trim().min(1, 'Message vide').max(4096),
  sessionId: z.string().uuid().optional(),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4096) }))
    .max(10)
    .optional(),
})

export interface IaChatResponse {
  reply: string
  blocks: YayeBlock[]
  sessionId: string
  toolsUsed: string[]
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<IaChatResponse>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })
  }

  const limited = await rateLimit(request, { windowMs: 60_000, max: 20, keyPrefix: `ia:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<IaChatResponse>>

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  const { message } = parsed.data
  const isNewSession = !parsed.data.sessionId
  const sessionId = parsed.data.sessionId ?? randomUUID()
  // Historique côté SERVEUR (Redis), pas celui fourni par le client (autorité serveur).
  const history = await loadContext(sessionId)
  const role = session.roles[0] ?? null
  const logBase = { sessionId, cjsUid: session.cjsUid, role, canal: 'web' as const }

  if (isNewSession) {
    await logAgentEvent({ ...logBase, typeEvenement: 'session_ouverte', payload: { roles: session.roles } })
  }
  await logAgentEvent({ ...logBase, typeEvenement: 'message_recu', payload: { longueur: message.length } })

  try {
    const result = await runAgent({
      message,
      history,
      cjsUid: session.cjsUid,
      roles: session.roles,
      sessionId,
      canal: 'web',
    })
    // Formateur web (Lot 5) : le rendu cards/actions est fait côté client (YayeBlocks).
    // On journalise la transmission + le format de canal pour la cohérence multi-canal.
    await logAgentEvent({ ...logBase, typeEvenement: 'format_canal', formatCanal: 'card_react' })
    await logAgentEvent({
      ...logBase,
      typeEvenement: 'contenu_transmis',
      payload: { blocs: (result.blocks ?? []).map((b) => b.kind) },
    })

    // Persiste le contexte côté serveur (cache chaud Redis, TTL 30 min web).
    await saveContext(
      sessionId,
      [...history, { role: 'user', content: message }, { role: 'assistant', content: result.reply }],
      TTL_WEB,
    )
    return NextResponse.json({
      data: { reply: result.reply, blocks: result.blocks, sessionId, toolsUsed: result.toolsUsed },
    })
  } catch (err) {
    await logAgentEvent({ ...logBase, typeEvenement: 'erreur', statut: 'echec', payload: { err: String(err) } })
    return NextResponse.json(
      { error: { code: 'AGENT_ERROR', message: "Yaye n'a pas pu traiter ta demande pour le moment." } },
      { status: 502 },
    )
  }
}
