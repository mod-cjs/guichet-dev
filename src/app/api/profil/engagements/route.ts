import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { EngagementSchema, MAX_ENGAGEMENTS } from '@/lib/profil-schemas'
import type { ApiResponse } from '@/types/api'
import type { EngagementItem } from '@/types/profil'

/**
 * GUIC-689 — Engagements associatifs / bénévolat.
 *
 * ⚠️ Le score de complétion n'est PAS recalculé : le barème compte « une
 * expérience professionnelle » et « un diplôme », pas les engagements. Les y
 * ajouter ferait bouger le score de tous les profils existants — c'est une
 * décision produit, pas un effet de bord d'une route de création.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<EngagementItem>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })
  }

  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: `eng-post:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<EngagementItem>>

  const body = await request.json().catch(() => null)
  const parsed = EngagementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  const count = await prisma.engagement.count({ where: { profil: { cjsUid: session.cjsUid } } })
  if (count >= MAX_ENGAGEMENTS) {
    return NextResponse.json(
      { error: { code: 'LIMIT_REACHED', message: `Maximum ${MAX_ENGAGEMENTS} engagements atteint` } },
      { status: 422 },
    )
  }

  const profil = await prisma.profilJeune.upsert({
    where:  { cjsUid: session.cjsUid },
    create: { cjsUid: session.cjsUid },
    update: {},
    select: { id: true },
  })

  const eng = await prisma.engagement.create({
    data: {
      profilId:     profil.id,
      role:         parsed.data.role,
      organisation: parsed.data.organisation,
      dateDebut:    new Date(parsed.data.dateDebut),
      dateFin:      parsed.data.dateFin ? new Date(parsed.data.dateFin) : null,
      description:  parsed.data.description ?? null,
    },
    select: { id: true, role: true, organisation: true, dateDebut: true, dateFin: true, description: true },
  })

  return NextResponse.json(
    {
      data: {
        id:           eng.id,
        role:         eng.role,
        organisation: eng.organisation,
        dateDebut:    eng.dateDebut.toISOString().slice(0, 10),
        dateFin:      eng.dateFin?.toISOString().slice(0, 10) ?? null,
        description:  eng.description,
      },
    },
    { status: 201 },
  )
}
