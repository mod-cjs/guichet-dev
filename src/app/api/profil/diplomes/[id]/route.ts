import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { recalculerEtPersisterScore } from '@/lib/profil-loader'
import { DiplomeSchema } from '@/lib/validations/diplome'
import type { ApiResponse } from '@/types/api'
import type { DiplomeResponse, DeleteDiplomeResponse } from '@/types/profil'

const SELECT_FIELDS = {
  id: true, intitule: true, etablissement: true, anneeObtention: true, niveau: true, mention: true, fichierUrl: true,
} as const

async function ownsDiplome(cjsUid: string, id: string): Promise<boolean> {
  const dip = await prisma.diplome.findFirst({
    where:  { id, profil: { cjsUid } },
    select: { id: true },
  })
  return dip !== null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<DiplomeResponse>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: `dip-put:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<DiplomeResponse>>

  const { id } = await params
  if (!(await ownsDiplome(session.cjsUid, id))) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Diplôme introuvable' } }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const parsed = DiplomeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  const diplome = await prisma.diplome.update({
    where: { id },
    data: {
      intitule:       parsed.data.intitule,
      etablissement:  parsed.data.etablissement,
      anneeObtention: parsed.data.anneeObtention,
      niveau:         parsed.data.niveau,
      mention:        parsed.data.mention ?? null,
    },
    select: SELECT_FIELDS,
  })

  const completionScore = await recalculerEtPersisterScore(session.cjsUid)
  return NextResponse.json({ data: { ...diplome, completionScore } })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<DeleteDiplomeResponse>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: `dip-delete:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<DeleteDiplomeResponse>>

  const { id } = await params
  if (!(await ownsDiplome(session.cjsUid, id))) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Diplôme introuvable' } }, { status: 404 })
  }

  await prisma.diplome.delete({ where: { id } })
  const completionScore = await recalculerEtPersisterScore(session.cjsUid)
  return NextResponse.json({ data: { completionScore } })
}
