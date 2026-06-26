import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { runAgent, streamAgent } from '@/lib/ia/agent'
import { logAgentEvent } from '@/lib/ia/agent-logs'
import { loadContext, saveContext, userContextKey, TTL_USER } from '@/lib/ia/context'
import { recordWebTurn } from '@/lib/ia/metrics/transcript-store'
import type { YayeBlock } from '@/lib/ia/blocks'

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

export async function POST(request: NextRequest): Promise<Response> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })
  }

  const limited = await rateLimit(request, { windowMs: 60_000, max: 20, keyPrefix: `ia:${session.cjsUid}` })
  if (limited) return limited

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
  // Mémoire conversationnelle unifiée par utilisateur (continuité cross-canal web↔WhatsApp).
  // Autorité serveur (Redis), pas l'historique fourni par le client.
  const ctxKey = userContextKey(session.cjsUid)
  const history = await loadContext(ctxKey)
  const role = session.roles[0] ?? null
  const logBase = { sessionId, cjsUid: session.cjsUid, role, canal: 'web' as const }

  if (isNewSession) {
    await logAgentEvent({ ...logBase, typeEvenement: 'session_ouverte', payload: { roles: session.roles } })
  }
  await logAgentEvent({ ...logBase, typeEvenement: 'message_recu', payload: { longueur: message.length } })

  // Persistance + journalisation de fin de tour, partagées par les deux modes.
  const finalizeTurn = async (reply: string, blocks: YayeBlock[]) => {
    await logAgentEvent({ ...logBase, typeEvenement: 'format_canal', formatCanal: 'card_react' })
    await logAgentEvent({ ...logBase, typeEvenement: 'contenu_transmis', payload: { blocs: (blocks ?? []).map((b) => b.kind) } })
    await recordWebTurn({
      sessionId,
      cjsUid: session.cjsUid,
      tourIndex: Math.floor(history.length / 2),
      userText: message,
      assistantText: reply,
    })
    await saveContext(
      ctxKey,
      [...history, { role: 'user', content: message }, { role: 'assistant', content: reply }],
      TTL_USER,
    )
  }

  // ── Mode STREAMING (SSE, #1) ────────────────────────────────────────────────
  // Activé via `Accept: text/event-stream`. Émet la progression (tool) puis les
  // tokens de la réponse au fil de l'eau, et un `done` final (reply + blocks).
  if (request.headers?.get?.('accept')?.includes('text/event-stream')) {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) =>
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        try {
          let reply = ''
          let blocks: YayeBlock[] = []
          let toolsUsed: string[] = []
          for await (const ev of streamAgent({
            message, history, cjsUid: session.cjsUid, roles: session.roles, sessionId, canal: 'web',
          })) {
            if (ev.type === 'tool') send('tool', { name: ev.name })
            else if (ev.type === 'token') send('token', { text: ev.text })
            else { reply = ev.reply; blocks = ev.blocks; toolsUsed = ev.toolsUsed }
          }
          await finalizeTurn(reply, blocks)
          send('done', { reply, blocks, sessionId, toolsUsed })
        } catch (err) {
          await logAgentEvent({ ...logBase, typeEvenement: 'erreur', statut: 'echec', payload: { err: String(err) } })
          send('error', { message: "Yaye n'a pas pu traiter ta demande pour le moment." })
        } finally {
          controller.close()
        }
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  }

  try {
    const result = await runAgent({
      message,
      history,
      cjsUid: session.cjsUid,
      roles: session.roles,
      sessionId,
      canal: 'web',
    })
    // Formateur web (Lot 5) : rendu cards côté client. Journalisation + persistance
    // de fin de tour (format_canal, contenu_transmis, transcript, mémoire unifiée).
    await finalizeTurn(result.reply, result.blocks)
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
