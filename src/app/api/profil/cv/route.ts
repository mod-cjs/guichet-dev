import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

/**
 * GUIC-223 — CV depuis profil.
 * Retourne le CV courant du jeune authentifié pour réutilisation dans
 * CandidatureModal ("Utiliser mon CV de profil").
 */
export interface ProfilCvResponse {
  cvUrl: string | null
  /** Nom déduit (vide pour l'instant — sera renseigné quand l'upload nommera le fichier). */
  name: string
  uploadedAt: string | null
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ProfilCvResponse>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  // Rate-limit léger par utilisateur (30/min/cjsUid).
  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: `profil-cv:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<ProfilCvResponse>>

  const profil = await prisma.profilJeune.findUnique({
    where: { cjsUid: session.cjsUid },
    select: { cvUrl: true, cvUploadedAt: true },
  })

  if (!profil || !profil.cvUrl) {
    return NextResponse.json({ data: { cvUrl: null, name: '', uploadedAt: null } })
  }

  return NextResponse.json({
    data: {
      cvUrl: profil.cvUrl,
      name: '',
      uploadedAt: profil.cvUploadedAt ? profil.cvUploadedAt.toISOString() : null,
    },
  })
}
