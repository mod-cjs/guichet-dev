/**
 * GET /api/candidatures/[id]/cv — proxy lecture privée du CV d'une candidature.
 *
 * GUIC-415 — Le `cvUrl` stocké pointe directement sur Vercel Blob en
 * `access: 'private'` (GUIC-364) : le lien direct renvoie 403 quand le jeune
 * clique. On proxifie via cette route serveur qui :
 *  - vérifie la session SSO,
 *  - check ownership (la candidature appartient au jeune connecté),
 *  - stream le binaire via `proxyPrivateBlob` (réutilise le pattern photo profil).
 *
 * Rate limit : 30 lectures / minute par utilisateur.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { proxyPrivateBlob } from '../../../profil/photo/file/route'

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
    keyPrefix: `candidature-cv-read:${session.cjsUid}`,
  })
  if (limited) return limited

  const { id } = await params

  const candidature = await prisma.candidature.findFirst({
    where: { id, cjsUid: session.cjsUid },
    select: { cvUrl: true },
  })

  if (!candidature) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Candidature introuvable' } },
      { status: 404 },
    )
  }
  if (!candidature.cvUrl) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Pas de CV joint' } },
      { status: 404 },
    )
  }

  return await proxyPrivateBlob(candidature.cvUrl)
}
