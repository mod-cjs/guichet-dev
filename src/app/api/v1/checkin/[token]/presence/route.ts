/**
 * POST /api/v1/checkin/[token]/presence — GUIC-474.
 *
 * Marque la présence d'un jeune à un événement (cours/session) de SON centre,
 * via le badge MyCJSCard scanné par le staff. Écrit `InscriptionEvenement.present`
 * (upsert : walk-in créé si non pré-inscrit) → alimente le taux de présence (GUIC-472).
 *
 * Garde : session staff (centre) + token carte valide + événement du centre du staff.
 * Idempotent (upsert `present`) → pas de consommation de nonce.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/auth/staff-session'
import { verifyCJSCardToken, CJSCardTokenError } from '@/lib/auth/verifyCJSCardToken'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const staff = await getStaffSession()
  if (!staff) {
    return NextResponse.json(
      { error: { code: 'STAFF_UNAUTHORIZED', message: 'Session staff requise' } },
      { status: 401 },
    )
  }

  const { token } = await params
  let payload
  try {
    payload = await verifyCJSCardToken(token)
  } catch (e) {
    if (e instanceof CJSCardTokenError && e.reason === 'expired') {
      return NextResponse.json(
        { error: { code: 'TOKEN_EXPIRED', message: 'Badge expiré — demande au jeune de rafraîchir sa carte' } },
        { status: 410 },
      )
    }
    return NextResponse.json({ error: { code: 'TOKEN_INVALID', message: 'Badge invalide' } }, { status: 401 })
  }
  if (!payload) {
    return NextResponse.json({ error: { code: 'TOKEN_INVALID', message: 'Badge invalide' } }, { status: 401 })
  }

  const cjsUid = payload.sub
  const body = (await req.json().catch(() => ({}))) as { evenementId?: unknown }
  const evenementId = typeof body.evenementId === 'string' ? body.evenementId : ''
  if (!evenementId) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'evenementId requis' } }, { status: 400 })
  }

  const evenement = await prisma.evenement.findUnique({
    where: { id: evenementId },
    select: { centreId: true, titre: true },
  })
  if (!evenement) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Événement introuvable' } }, { status: 404 })
  }
  // Garde centre : le staff ne peut marquer une présence que pour un événement de SON centre.
  if (evenement.centreId !== staff.centreId) {
    return NextResponse.json(
      { error: { code: 'CENTRE_FORBIDDEN', message: 'Événement hors de votre centre' } },
      { status: 403 },
    )
  }

  await prisma.inscriptionEvenement.upsert({
    where: { cjsUid_evenementId: { cjsUid, evenementId } },
    create: { cjsUid, evenementId, statut: 'present' },
    update: { statut: 'present' },
  })

  await recordAudit(staff.email, 'evenement.presence', {
    targetType: 'evenement',
    targetId: evenementId,
    meta: { via: 'badge' },
  })

  return NextResponse.json({ data: { ok: true, titre: evenement.titre } })
}
