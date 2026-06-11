/**
 * GET /api/profil/certificats — liste des certificats (Moodle + manuels) du jeune.
 * POST /api/profil/certificats — création manuelle d'un certificat (GUIC-365).
 *
 * Les certificats manuels réutilisent la table `CertificatMoodle` (le modèle
 * est en cours de généralisation). Le champ `moodleCertId` étant `UNIQUE NOT
 * NULL`, on génère un identifiant synthétique `manual:<uuid>` pour les
 * créations manuelles, distinct des imports Moodle.
 */

import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'
import type { CertificatItem } from '@/types/profil'

const SELECT_FIELDS = {
  id: true, formation: true, obtenuLe: true, urlCertificat: true, fichierUrl: true,
} as const

const MAX_CERTIFICATS = 50

const CertificatManuelSchema = z.object({
  formation: z.string().min(2).max(200),
  organisme: z.string().min(2).max(200).optional().nullable(),
  obtenuLe:  z.string().min(8).max(10),  // YYYY-MM-DD
})

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<CertificatItem[]>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000, max: 30, keyPrefix: `cert-get:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<CertificatItem[]>>

  const rows = await prisma.certificatMoodle.findMany({
    where:   { profil: { cjsUid: session.cjsUid } },
    select:  SELECT_FIELDS,
    orderBy: { obtenuLe: 'desc' },
  })

  const items: CertificatItem[] = rows.map(c => ({
    id:            c.id,
    formation:     c.formation,
    obtenuLe:      c.obtenuLe.toISOString().slice(0, 10),
    urlCertificat: c.urlCertificat,
    fichierUrl:    c.fichierUrl,
  }))

  return NextResponse.json({ data: items })
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<CertificatItem>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000, max: 10, keyPrefix: `cert-post:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<CertificatItem>>

  const body = await request.json().catch(() => null)
  const parsed = CertificatManuelSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  const obtenuLeDate = new Date(parsed.data.obtenuLe)
  if (Number.isNaN(obtenuLeDate.getTime())) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Date invalide' } },
      { status: 400 },
    )
  }

  const count = await prisma.certificatMoodle.count({
    where: { profil: { cjsUid: session.cjsUid } },
  })
  if (count >= MAX_CERTIFICATS) {
    return NextResponse.json(
      { error: { code: 'LIMIT_REACHED', message: `Maximum ${MAX_CERTIFICATS} certificats atteint` } },
      { status: 422 },
    )
  }

  const profil = await prisma.profilJeune.upsert({
    where:  { cjsUid: session.cjsUid },
    create: { cjsUid: session.cjsUid },
    update: {},
    select: { id: true },
  })

  const created = await prisma.certificatMoodle.create({
    data: {
      profilId:     profil.id,
      moodleCertId: `manual:${randomUUID()}`,
      formation:    parsed.data.formation,
      obtenuLe:     obtenuLeDate,
      urlCertificat: null,
    },
    select: SELECT_FIELDS,
  })

  const item: CertificatItem = {
    id:            created.id,
    formation:     created.formation,
    obtenuLe:      created.obtenuLe.toISOString().slice(0, 10),
    urlCertificat: created.urlCertificat,
    fichierUrl:    created.fichierUrl,
  }

  return NextResponse.json({ data: item }, { status: 201 })
}
