import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { recalculerEtPersisterScore } from '@/lib/profil-loader'
import { ExperienceSchema, MAX_EXPERIENCES } from '@/lib/profil-schemas'
import type { ApiResponse } from '@/types/api'
import type { ExperienceResponse } from '@/types/profil'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ExperienceResponse>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: `exp-post:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<ExperienceResponse>>

  const body = await request.json().catch(() => null)
  const parsed = ExperienceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  // Cap : max MAX_EXPERIENCES expériences par profil
  const count = await prisma.experience.count({ where: { profil: { cjsUid: session.cjsUid } } })
  if (count >= MAX_EXPERIENCES) {
    return NextResponse.json(
      { error: { code: 'LIMIT_REACHED', message: `Maximum ${MAX_EXPERIENCES} expériences atteint` } },
      { status: 422 },
    )
  }

  // Upsert ProfilJeune si inexistant
  const profil = await prisma.profilJeune.upsert({
    where:  { cjsUid: session.cjsUid },
    create: { cjsUid: session.cjsUid },
    update: {},
    select: { id: true },
  })

  const exp = await prisma.experience.create({
    data: {
      profilId:     profil.id,
      poste:        parsed.data.poste,
      organisation: parsed.data.organisation,
      dateDebut:    new Date(parsed.data.dateDebut),
      dateFin:      parsed.data.dateFin ? new Date(parsed.data.dateFin) : null,
      description:  parsed.data.description ?? null,
    },
    select: { id: true, poste: true, organisation: true, dateDebut: true, dateFin: true, description: true },
  })

  const completionScore = await recalculerEtPersisterScore(session.cjsUid)

  return NextResponse.json({
    data: {
      ...exp,
      dateDebut: exp.dateDebut.toISOString().slice(0, 10),
      dateFin:   exp.dateFin?.toISOString().slice(0, 10) ?? null,
      completionScore,
    },
  }, { status: 201 })
}
