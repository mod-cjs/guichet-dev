import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { recordHumanLabel } from '@/lib/ia/metrics/calibration-data'
import { canManageYaye } from '@/lib/ia/admin/rbac'
import type { DimScores } from '@/lib/ia/metrics/calibration'
import type { ApiResponse } from '@/types/api'

// POST /api/admin/yaye/sessions/[sessionId]/label — label HUMAIN d'une session.
// Garde admin. Alimente la calibration juge↔humain (on ajoute une ligne
// yaye_eval_scores préfixée « humain: », sans toucher aux scores du juge).

const DIMS = ['fidelite', 'pertinence', 'utilite', 'persona', 'conformiteCdp', 'langue'] as const

function parseScores(body: unknown): DimScores | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const out = {} as DimScores
  for (const d of DIMS) {
    const v = b[d]
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) return null
    out[d] = v
  }
  return out
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse<ApiResponse<{ sessionId: string }>>> {
  const session = await getSession(request)
  if (!session || !canManageYaye(session.roles)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès réservé au staff (admin, directeur, conseiller)' } },
      { status: 403 },
    )
  }

  const { sessionId } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Corps JSON invalide' } }, { status: 400 })
  }

  const scores = parseScores(body)
  if (!scores) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Scores invalides (6 dimensions entre 0 et 1)' } },
      { status: 400 },
    )
  }
  const commentaireRaw = (body as { commentaire?: unknown }).commentaire
  const commentaire = typeof commentaireRaw === 'string' ? commentaireRaw.slice(0, 500) : null

  await recordHumanLabel({ sessionId, raterCjsUid: session.cjsUid, scores, commentaire })

  return NextResponse.json({ data: { sessionId } })
}
