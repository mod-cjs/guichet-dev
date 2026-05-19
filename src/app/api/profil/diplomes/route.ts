import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { recalculerEtPersisterScore } from '@/lib/profil-loader'
import { DiplomeSchema, MAX_DIPLOMES } from '@/lib/validations/diplome'
import type { ApiResponse } from '@/types/api'
import type { DiplomeItem, DiplomeResponse } from '@/types/profil'

const SELECT_FIELDS = {
  id: true, intitule: true, etablissement: true, anneeObtention: true, niveau: true, mention: true,
} as const

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<DiplomeItem[]>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 30, keyPrefix: `dip-get:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<DiplomeItem[]>>

  const items = await prisma.diplome.findMany({
    where:   { profil: { cjsUid: session.cjsUid } },
    select:  SELECT_FIELDS,
    orderBy: { anneeObtention: 'desc' },
  })

  return NextResponse.json({ data: items })
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<DiplomeResponse>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: `dip-post:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<DiplomeResponse>>

  const body = await request.json().catch(() => null)
  const parsed = DiplomeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  const count = await prisma.diplome.count({ where: { profil: { cjsUid: session.cjsUid } } })
  if (count >= MAX_DIPLOMES) {
    return NextResponse.json(
      { error: { code: 'LIMIT_REACHED', message: `Maximum ${MAX_DIPLOMES} diplômes atteint` } },
      { status: 422 },
    )
  }

  const profil = await prisma.profilJeune.upsert({
    where:  { cjsUid: session.cjsUid },
    create: { cjsUid: session.cjsUid },
    update: {},
    select: { id: true },
  })

  const diplome = await prisma.diplome.create({
    data: {
      profilId:       profil.id,
      intitule:       parsed.data.intitule,
      etablissement:  parsed.data.etablissement,
      anneeObtention: parsed.data.anneeObtention,
      niveau:         parsed.data.niveau,
      mention:        parsed.data.mention ?? null,
    },
    select: SELECT_FIELDS,
  })

  const completionScore = await recalculerEtPersisterScore(session.cjsUid)

  return NextResponse.json({ data: { ...diplome, completionScore } }, { status: 201 })
}
