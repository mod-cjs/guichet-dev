/**
 * GUIC-565 (F1) — GET /api/reservations/[id]/justif
 *
 * Sert le justificatif d'une réservation à travers un proxy AUTORISÉ. Avant ce fix, la carte de
 * réservation liait directement `Reservation.justifFileUrl` (blob privé Vercel → 403 dans le
 * navigateur ; référence `s3://` → schéma non géré). Ici :
 *   - autorisation : propriétaire de la réservation OU conseiller rattaché au centre concerné ;
 *   - lecture via `stockagePour(ref)` → gère les `s3://` (MinIO) ET les URL Vercel héritées ;
 *   - le contenu est streamé par l'application ; ni jeton ni URL de stockage n'atteint le client.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { peutVoirJustif } from '@/lib/reservations/justif-access'
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
    keyPrefix: `reservation-justif-read:${session.cjsUid}`,
  })
  if (limited) return limited

  const { id } = await params

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    select: { cjsUid: true, centreId: true, justifFileUrl: true },
  })

  if (!reservation) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Réservation introuvable' } },
      { status: 404 },
    )
  }

  // Conseiller éventuel : sur quel centre est-il rattaché ?
  const ctx = await getConseillerContext(session.cjsUid)

  const autorise = peutVoirJustif({
    sessionCjsUid: session.cjsUid,
    reservationCjsUid: reservation.cjsUid,
    reservationCentreId: reservation.centreId,
    conseillerCentreId: ctx?.centreId ?? null,
  })

  if (!autorise) {
    // 404 plutôt que 403 : ne pas révéler l'existence d'un justificatif à un tiers.
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Réservation introuvable' } },
      { status: 404 },
    )
  }

  if (!reservation.justifFileUrl) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Pas de justificatif joint' } },
      { status: 404 },
    )
  }

  return await proxyPrivateBlob(reservation.justifFileUrl)
}
