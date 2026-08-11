/**
 * GUIC-689 — `POST /api/candidatures/[id]/retrait`
 *
 * Le candidat retire sa propre candidature.
 *
 * Auth : SSO obligatoire. Rate-limit : 10/min/cjsUid (une action rare et
 * définitive — inutile d'en autoriser davantage).
 *
 * Règles, reprises de la maquette v5 (`candidatures-web.jsx:204,216`) :
 *  - retrait fermé dès qu'une décision existe (`Retenue` / `Refusee`) : la
 *    décision du recruteur doit rester lisible des deux côtés ;
 *  - état terminal — la contrainte d'unicité `[cjsUid, opportuniteId]` interdit
 *    de re-candidater, ce que la modale annonce (« irréversible ») ;
 *  - le recruteur est notifié, sinon il continue d'instruire un dossier
 *    abandonné.
 *
 * Une candidature qui n'appartient pas à l'appelant renvoie **404**, jamais 403 :
 * un 403 confirmerait qu'elle existe.
 */
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { recordAudit } from '@/lib/audit'
import { notifyRecruteurRetrait } from '@/lib/notifications/candidature-retrait'
import type { ApiResponse } from '@/types/api'

/** États depuis lesquels le retrait reste ouvert. */
const RETIRABLES = ['En_attente', 'Vue'] as const

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ statut: string }>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 10,
    keyPrefix: `candidature-retrait:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited as NextResponse<ApiResponse<{ statut: string }>>

  const { id } = await context.params

  // Filtrée sur le propriétaire : celle d'autrui est introuvable, pas interdite.
  const candidature = await prisma.candidature.findFirst({
    where: { id, cjsUid: session.cjsUid },
    select: { id: true, statut: true },
  })
  if (!candidature) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Candidature introuvable' } },
      { status: 404 },
    )
  }

  // Mise à jour CONDITIONNELLE plutôt que `update` après lecture : deux clics
  // simultanés passeraient tous deux le contrôle ci-dessus, et le recruteur
  // recevrait deux notifications pour un seul retrait. Ici, le second voit
  // `count === 0`.
  const { count } = await prisma.candidature.updateMany({
    where: { id, cjsUid: session.cjsUid, statut: { in: [...RETIRABLES] } },
    data: { statut: 'Retiree' },
  })

  if (count === 0) {
    return NextResponse.json(
      {
        error: {
          code: 'RETRAIT_IMPOSSIBLE',
          message:
            candidature.statut === 'Retiree'
              ? 'Cette candidature a déjà été retirée.'
              : 'Le recruteur a déjà statué : cette candidature ne peut plus être retirée.',
        },
      },
      { status: 409 },
    )
  }

  await recordAudit(session.cjsUid, 'candidature.retrait', {
    targetType: 'candidature',
    targetId: id,
    meta: { statutPrecedent: candidature.statut },
  })

  // Fail-soft : une notification en échec ne doit pas laisser croire au candidat
  // que son retrait n'a pas été pris en compte — il l'est, il est en base.
  await notifyRecruteurRetrait(id)

  revalidatePath('/jeune/mes-candidatures')
  revalidatePath(`/jeune/mes-candidatures/${id}`)

  return NextResponse.json({ data: { statut: 'Retiree' } }, { status: 200 })
}
