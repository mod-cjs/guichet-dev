/**
 * GET /api/recruteur/candidatures/[id]/cv — lecture privée du CV d'un candidat
 * par le recruteur (GUIC-485 / complète GUIC-230).
 *
 * Le CV est stocké en Vercel Blob `private` (CDP, GUIC-364) : le lien direct renvoie
 * 403. Cette route :
 *  - vérifie la session SSO + le rôle `recruteur`,
 *  - vérifie l'ownership (la candidature relève d'une offre du recruteur : `recruteurUid`
 *    OU son organisation),
 *  - journalise l'accès PII (`candidature.cv.read`, cible = candidat) — conformité CDP,
 *  - stream le binaire via `proxyPrivateBlob`.
 *
 * Rate limit : 30 lectures / minute par recruteur.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { auditPiiAccess } from '@/lib/audit'
import type { Prisma } from '@prisma/client'
import { proxyPrivateBlob } from '../../../../profil/photo/file/route'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })
  }
  if (!session.roles.includes('recruteur')) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Accès recruteur requis' } }, { status: 403 })
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: `recruteur-cv-read:${session.cjsUid}`,
  })
  if (limited) return limited

  const { id } = await params

  const org = await prisma.organisation.findFirst({ where: { cjsUid: session.cjsUid }, select: { id: true } })
  const OR: Prisma.OpportuniteWhereInput[] = [{ recruteurUid: session.cjsUid }]
  if (org?.id) OR.push({ organisationId: org.id })

  const candidature = await prisma.candidature.findFirst({
    where: { id, opportunite: { deletedAt: null, OR } },
    select: { cvUrl: true, cjsUid: true },
  })

  if (!candidature || !candidature.cvUrl) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'CV introuvable' } }, { status: 404 })
  }

  // Traçabilité CDP : qui (recruteur) a lu le CV de qui (candidat), quand.
  await auditPiiAccess('candidature.cv.read', session.cjsUid, {
    targetCjsUid: candidature.cjsUid,
    meta: { candidatureId: id },
  })

  return await proxyPrivateBlob(candidature.cvUrl)
}
