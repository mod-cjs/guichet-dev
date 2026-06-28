import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { setEscaladeStatut } from '@/lib/ia/admin/escalades'
import { canManageYaye } from '@/lib/ia/admin/rbac'
import type { ApiResponse } from '@/types/api'
import type { StatutEscalade } from '@prisma/client'

// PATCH /api/admin/yaye/escalades/[id] — change le stade de traitement d'une escalade.
// Garde de session admin. Mutation de l'ÉTAT uniquement (escalades_yaye), jamais des logs.

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

  try {
    await setEscaladeStatut(id, statut as StatutEscalade, session.cjsUid)
  } catch {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Escalade introuvable' } },
      { status: 404 },
    )
  }

  return NextResponse.json({ data: { id, statut: statut as StatutEscalade } })
}
