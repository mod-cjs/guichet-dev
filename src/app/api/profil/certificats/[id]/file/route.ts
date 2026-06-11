/**
 * GET /api/profil/certificats/[id]/file — proxy lecture scan certificat privé.
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
    keyPrefix: `profil-certif-read:${session.cjsUid}`,
  })
  if (limited) return limited

  const { id } = await params
  const certif = await prisma.certificatMoodle.findFirst({
    where: { id, profil: { cjsUid: session.cjsUid } },
    select: { fichierUrl: true },
  })

  if (!certif?.fichierUrl) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Pas de fichier' } },
      { status: 404 },
    )
  }

  return await proxyPrivateBlob(certif.fichierUrl)
}
