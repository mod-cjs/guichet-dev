/**
 * DELETE /api/profil/certificats/[id] — suppression d'un certificat manuel
 * du jeune authentifié (GUIC-365). Les imports Moodle (`moodleCertId` sans
 * préfixe `manual:`) sont rejetés car leur suppression doit se faire côté
 * Moodle ou via le job d'import.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000, max: 10, keyPrefix: `cert-del:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<{ ok: true }>>

  const { id } = await params
  const owns = await prisma.certificatMoodle.findFirst({
    where:  { id, profil: { cjsUid: session.cjsUid } },
    select: { id: true, moodleCertId: true },
  })
  if (!owns) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Certificat introuvable' } },
      { status: 404 },
    )
  }

  if (!owns.moodleCertId.startsWith('manual:')) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Les certificats Moodle ne peuvent pas être supprimés ici.' } },
      { status: 403 },
    )
  }

  await prisma.certificatMoodle.delete({ where: { id: owns.id } })
  return NextResponse.json({ data: { ok: true } })
}
