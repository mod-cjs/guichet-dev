import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { recordFeedback } from '@/lib/ia/metrics/feedback'
import type { ApiResponse } from '@/types/api'

// M12 — IA · Feedback conversationnel Yaye (GUIC-435, jalon B, couche 5).
// Pouce 👍/👎 par message côté web. Écriture fail-soft dans yaye_feedback.

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  tourIndex: z.number().int().min(0).max(1000).optional(),
  note: z.union([z.literal(1), z.literal(-1)]),
  raison: z.string().trim().max(2000).optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })
  }

  const limited = await rateLimit(request, { windowMs: 60_000, max: 60, keyPrefix: `ia-fb:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<{ ok: true }>>

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  await recordFeedback({
    sessionId: parsed.data.sessionId,
    cjsUid: session.cjsUid,
    canal: 'web',
    tourIndex: parsed.data.tourIndex,
    note: parsed.data.note,
    raison: parsed.data.raison,
  })

  return NextResponse.json({ data: { ok: true } })
}
