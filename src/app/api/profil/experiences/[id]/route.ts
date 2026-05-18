import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { recalculerEtPersisterScore } from '@/lib/profil-loader'
import { ExperienceSchema } from '@/lib/profil-schemas'
import type { ApiResponse } from '@/types/api'
import type { ExperienceResponse, DeleteExperienceResponse } from '@/types/profil'

async function ownsExperience(cjsUid: string, id: string): Promise<boolean> {
  const exp = await prisma.experience.findFirst({
    where: { id, profil: { cjsUid } },
    select: { id: true },
  })
  return exp !== null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ExperienceResponse>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: `exp-put:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<ExperienceResponse>>

  const { id } = await params
  if (!(await ownsExperience(session.cjsUid, id))) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Expérience introuvable' } }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const parsed = ExperienceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  const exp = await prisma.experience.update({
    where: { id },
    data: {
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
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<DeleteExperienceResponse>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: `exp-delete:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<DeleteExperienceResponse>>

  const { id } = await params
  if (!(await ownsExperience(session.cjsUid, id))) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Expérience introuvable' } }, { status: 404 })
  }

  await prisma.experience.delete({ where: { id } })
  const completionScore = await recalculerEtPersisterScore(session.cjsUid)
  return NextResponse.json({ data: { completionScore } })
}
