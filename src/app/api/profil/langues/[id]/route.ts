import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

/**
 * GUIC-689 — Retrait d'une langue déclarée.
 *
 * La suppression est filtrée par `profil.cjsUid` en plus de l'`id` : sans cela,
 * connaître l'identifiant d'une ligne suffirait à supprimer la langue de
 * quelqu'un d'autre. Un `delete` sur l'id seul serait une faille d'autorisation
 * silencieuse.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })
  }

  const limited = await rateLimit(request, { windowMs: 60_000, max: 20, keyPrefix: `langue-del:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<{ id: string }>>

  const { id } = await params

  const { count } = await prisma.langueProfil.deleteMany({
    where: { id, profil: { cjsUid: session.cjsUid } },
  })

  if (count === 0) {
    // Introuvable OU appartenant à autrui : même réponse dans les deux cas, pour
    // ne pas révéler l'existence de la ligne d'un tiers.
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Langue introuvable' } }, { status: 404 })
  }

  return NextResponse.json({ data: { id } })
}
