import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { setEscaladeStatut, EscaladeConflictError } from '@/lib/ia/admin/escalades'
import { canManageYaye } from '@/lib/ia/admin/rbac'
import { recordAudit } from '@/lib/audit'
import type { ApiResponse } from '@/types/api'
import type { StatutEscalade } from '@prisma/client'

// PATCH /api/admin/yaye/escalades/[id] — change le stade de traitement d'une escalade.
// Garde de session admin. Mutation de l'ÉTAT uniquement (escalades_yaye), jamais des logs.
// Chaque action est JOURNALISÉE (traçabilité d'une file qui traite des signalements de danger)
// et protégée par une garde de concurrence optimiste (file partagée entre opérateurs).

const STATUTS: StatutEscalade[] = ['en_attente', 'prise_en_charge', 'resolue']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ id: string; statut: StatutEscalade }>>> {
  const session = await getSession()
  if (!session || !canManageYaye(session.roles)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès réservé au staff (admin, directeur, conseiller)' } },
      { status: 403 },
    )
  }

  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Corps JSON invalide' } },
      { status: 400 },
    )
  }

  const statut = (body as { statut?: unknown })?.statut
  if (typeof statut !== 'string' || !STATUTS.includes(statut as StatutEscalade)) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Statut invalide' } },
      { status: 400 },
    )
  }
  // GUIC-259 — note de clôture (facultative), bornée ; n'a d'effet qu'à la résolution.
  const noteRaw = (body as { resolutionNote?: unknown })?.resolutionNote
  const resolutionNote = typeof noteRaw === 'string' ? noteRaw.slice(0, 2000) : null
  // Garde de concurrence : statut que l'opérateur voyait (optionnel, back-compat).
  const fromRaw = (body as { expectedFrom?: unknown })?.expectedFrom
  const expectedFrom = typeof fromRaw === 'string' && STATUTS.includes(fromRaw as StatutEscalade)
    ? (fromRaw as StatutEscalade)
    : undefined

  try {
    await setEscaladeStatut(id, statut as StatutEscalade, session.cjsUid, resolutionNote, expectedFrom)
  } catch (err) {
    if (err instanceof EscaladeConflictError) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Cette escalade a changé entre-temps — rafraîchis la file.' } },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Escalade introuvable' } },
      { status: 404 },
    )
  }

  // Journal d'audit : trace non-PII (jamais le texte de la note, seulement sa présence).
  await recordAudit(session.cjsUid, 'yaye.escalade.statut', {
    targetType: 'escalade_yaye',
    targetId: id,
    meta: { statut, from: expectedFrom ?? null, avecNote: statut === 'resolue' && !!resolutionNote },
  })

  return NextResponse.json({ data: { id, statut: statut as StatutEscalade } })
}
