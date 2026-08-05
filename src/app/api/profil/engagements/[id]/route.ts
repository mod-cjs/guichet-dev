import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

/**
 * GUIC-689 — Suppression d'un engagement.
 *
 * Filtrée par `profil.cjsUid` en plus de l'`id` : un `delete` sur l'id seul
 * laisserait quiconque connaît un identifiant supprimer l'engagement d'autrui.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })
  }

  const limited = await rateLimit(request, { windowMs: 60_000, max: 20, keyPrefix: `eng-del:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<{ id: string }>>

  const { id } = await params

  const { count } = await prisma.engagement.deleteMany({
    where: { id, profil: { cjsUid: session.cjsUid } },
  })

  if (count === 0) {
    // Introuvable OU appartenant à autrui : réponse identique, pour ne pas
    // révéler l'existence de la ligne d'un tiers.
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Engagement introuvable' } }, { status: 404 })
  }

  return NextResponse.json({ data: { id } })
}
