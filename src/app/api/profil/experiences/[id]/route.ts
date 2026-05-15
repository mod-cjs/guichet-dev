import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

const ExperienceSchema = z.object({
  poste:        z.string().min(1).max(150),
  organisation: z.string().min(1).max(150),
  dateDebut:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateFin:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  description:  z.string().max(1000).optional().nullable(),
})

async function ownsExperience(cjsUid: string, experienceId: string): Promise<boolean> {
  const exp = await prisma.experience.findFirst({
    where: { id: experienceId, profil: { cjsUid } },
    select: { id: true },
  })
  return exp !== null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: 'exp-put' })
  if (limited) return limited as NextResponse<ApiResponse>

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

  const experience = await prisma.experience.update({
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

  return NextResponse.json({
    data: {
      ...experience,
      dateDebut: experience.dateDebut.toISOString().slice(0, 10),
      dateFin:   experience.dateFin?.toISOString().slice(0, 10) ?? null,
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: 'exp-delete' })
  if (limited) return limited as NextResponse<ApiResponse>

  const { id } = await params
  if (!(await ownsExperience(session.cjsUid, id))) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Expérience introuvable' } }, { status: 404 })
  }

  await prisma.experience.delete({ where: { id } })
  return NextResponse.json({ data: null }, { status: 200 })
}
