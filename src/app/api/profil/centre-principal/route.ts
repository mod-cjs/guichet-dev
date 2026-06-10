import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

const BodySchema = z.object({
  centreId: z.string().min(1).nullable(),
})

/**
 * `POST /api/profil/centre-principal` — Wave 2 onboarding centre principal.
 *
 * Auth requise (cookie SSO). Met à jour `ProfilJeune.centrePrincipalId`.
 * `null` autorisé = skip de l'étape onboarding.
 * Rate-limit : 10/min par cjsUid.
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Connexion requise' } },
      { status: 401 },
    )
  }

  const rl = await rateLimit(request, {
    windowMs: 60_000,
    max: 10,
    keyPrefix: `profil-centre-principal:${session.cjsUid}`,
    authenticated: true,
  })
  if (rl) return rl as NextResponse<ApiResponse<{ ok: true }>>

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Payload invalide' } },
      { status: 400 },
    )
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_BODY',
          message: 'centreId attendu (string ou null)',
        },
      },
      { status: 400 },
    )
  }

  const { centreId } = parsed.data

  if (centreId) {
    const exists = await prisma.centre.findUnique({
      where: { id: centreId },
      select: { id: true, estActif: true },
    })
    if (!exists || !exists.estActif) {
      return NextResponse.json(
        { error: { code: 'CENTRE_NOT_FOUND', message: 'Centre introuvable' } },
        { status: 404 },
      )
    }
  }

  // Mise à jour défensive — la colonne `centrePrincipalId` est introduite W0
  // (PR #116). On encapsule pour ne pas casser si la migration n'est pas encore
  // appliquée en local.
  try {
    await prisma.profilJeune.update({
      where: { cjsUid: session.cjsUid },
      data: { centrePrincipalId: centreId },
    })
  } catch (e) {
    console.error('[profil/centre-principal] update failed', e)
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_FAILED',
          message: 'Impossible de mettre à jour le centre principal',
        },
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: { ok: true } })
}
