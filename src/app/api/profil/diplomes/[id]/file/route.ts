/**
 * GET /api/profil/diplomes/[id]/file — proxy lecture scan diplôme privé.
 *
 * GUIC-364 — ownership check + token Blob côté serveur.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { proxyPrivateBlob } from '../../../photo/file/route'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: `profil-diplome-read:${session.cjsUid}`,
  })
  if (limited) return limited

  const { id } = await params
  const diplome = await prisma.diplome.findFirst({
    where: { id, profil: { cjsUid: session.cjsUid } },
    select: { fichierUrl: true },
  })

  if (!diplome?.fichierUrl) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Pas de fichier' } },
      { status: 404 },
    )
  }

  return await proxyPrivateBlob(diplome.fichierUrl)
}
