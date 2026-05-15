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

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: 'exp-post' })
  if (limited) return limited as NextResponse<ApiResponse>

  const body = await request.json().catch(() => null)
  const parsed = ExperienceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  // Crée le ProfilJeune si inexistant
  const profil = await prisma.profilJeune.upsert({
    where:  { cjsUid: session.cjsUid },
    create: { cjsUid: session.cjsUid },
    update: {},
    select: { id: true },
  })

  const experience = await prisma.experience.create({
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

  return NextResponse.json({
    data: {
      ...experience,
      dateDebut: experience.dateDebut.toISOString().slice(0, 10),
      dateFin:   experience.dateFin?.toISOString().slice(0, 10) ?? null,
    },
  }, { status: 201 })
}
