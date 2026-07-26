import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { fireBeneficiaireGraphSync } from '@/lib/ia/graph/fire-sync'
import type { ApiResponse } from '@/types/api'

// GUIC-23 — M5 · Inscription / désinscription à un événement (auth SSO requise).
// Réutilise la table existante `inscriptions_evenements` (modèle `InscriptionEvenement`).

const UNAUTHORIZED = { code: 'UNAUTHORIZED', message: 'Non authentifié' }

interface InscriptionStatePayload {
  inscrit: boolean
}

/**
 * GET /api/evenements/[id]/inscription — état d'inscription de l'utilisateur courant.
 * Renvoie `{ inscrit: boolean }` (false si annulé ou jamais inscrit).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<InscriptionStatePayload>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })

  const { id } = await params

  const row = await prisma.inscriptionEvenement.findUnique({
    where: { cjsUid_evenementId: { cjsUid: session.cjsUid, evenementId: id } },
    select: { statut: true },
  })

  const inscrit = !!row && row.statut !== 'annule'
  return NextResponse.json({ data: { inscrit } })
}

/**
 * POST /api/evenements/[id]/inscription — inscrit l'utilisateur.
 * Idempotent : si déjà inscrit → 200. Si l'événement n'existe pas → 404.
 * Si une ligne `annule` existe, elle est réactivée (`inscrit`).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 20,
    keyPrefix: `evt-insc-post:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse>

  const { id } = await params

  const evenement = await prisma.evenement.findUnique({
    where: { id },
    select: { id: true, statut: true, dateDebut: true, dateFin: true },
  })
  if (!evenement) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Événement introuvable' } },
      { status: 404 },
    )
  }
  if (evenement.statut === 'termine' || evenement.statut === 'annule') {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: 'Événement non ouvert aux inscriptions' } },
      { status: 409 },
    )
  }
  // Garde-fou : un événement dont la date de fin (ou la date de début, si pas de fin)
  // est dépassée ne doit pas accepter d'inscription, même si son `statut` n'a pas
  // encore été basculé à `termine` par le job de transition.
  const now = Date.now()
  const endTs = (evenement.dateFin ?? evenement.dateDebut).getTime()
  if (endTs < now) {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: 'Événement déjà passé' } },
      { status: 409 },
    )
  }

  try {
    const existing = await prisma.inscriptionEvenement.findUnique({
      where: { cjsUid_evenementId: { cjsUid: session.cjsUid, evenementId: id } },
    })

    if (existing) {
      if (existing.statut === 'annule') {
        const reactivated = await prisma.inscriptionEvenement.update({
          where: { cjsUid_evenementId: { cjsUid: session.cjsUid, evenementId: id } },
          data: { statut: 'inscrit' },
        })
        fireBeneficiaireGraphSync(session.cjsUid) // INSCRIT_A (statut d'arête)
        return NextResponse.json({ data: reactivated }, { status: 200 })
      }
      return NextResponse.json({ data: existing }, { status: 200 })
    }

    const created = await prisma.inscriptionEvenement.create({
      data: { cjsUid: session.cjsUid, evenementId: id, statut: 'inscrit' },
    })
    fireBeneficiaireGraphSync(session.cjsUid) // INSCRIT_A
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err) {
    // P2002 = unique constraint (race condition) → considère comme déjà inscrit
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: { code: 'ALREADY_REGISTERED', message: 'Déjà inscrit' } },
        { status: 409 },
      )
    }
    throw err
  }
}

/**
 * DELETE /api/evenements/[id]/inscription — annule l'inscription.
 * Idempotent : 204 même si pas d'inscription préalable. Marque `statut=annule`
 * (audit trail) plutôt que suppression dure.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse> | NextResponse> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: `evt-insc-del:${session.cjsUid}`,
  })
  if (limited) return limited

  const { id } = await params

  await prisma.inscriptionEvenement.updateMany({
    where: { cjsUid: session.cjsUid, evenementId: id, statut: { not: 'annule' } },
    data: { statut: 'annule' },
  })

  return new NextResponse(null, { status: 204 })
}
