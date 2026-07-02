/**
 * GET /api/profil/cv/file — proxy lecture privée du CV.
 *
 * GUIC-364 — Vercel Blob privé. Stream le CV avec token côté serveur.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { auditPiiAccess } from '@/lib/audit'
import { proxyPrivateBlob } from '../../photo/file/route'

export async function GET(request: NextRequest): Promise<NextResponse> {
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
    keyPrefix: `profil-cv-read:${session.cjsUid}`,
  })
  if (limited) return limited

  const profil = await prisma.profilJeune.findUnique({
    where: { cjsUid: session.cjsUid },
    select: { cvUrl: true },
  })

  if (!profil?.cvUrl) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Pas de CV' } },
      { status: 404 },
    )
  }

  // GUIC-476 — trace CDP de l'accès à un document personnel sensible (fail-soft).
  await auditPiiAccess('ressource_sensible.download', session.cjsUid, {
    targetCjsUid: session.cjsUid,
    meta: { docType: 'cv' },
  }).catch(() => {})

  return await proxyPrivateBlob(profil.cvUrl)
}
