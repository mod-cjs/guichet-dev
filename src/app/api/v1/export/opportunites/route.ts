/**
 * Data Hub — Export opportunités (M13 / GUIC-184 — 178c/4).
 *
 * Endpoint Bearer-token consommé par les partenaires BI. Le payload est **plat**
 * (DP7) : chaque colonne sous-type est exposée préfixée par le slug du sous-type,
 * `null` quand non applicable. Cf. spec §6.3.
 *
 * Stratégie hybride : tant que la migration data (GUIC-185 / 178d) n'est pas
 * exécutée, les rows legacy sont exportées avec tous les champs sous-type à
 * `null` et `type` dérivé du legacy enum en lowercase. Aucune rupture de contrat.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  toOpportuniteExportDTOArray,
  type OpportuniteExportDTO,
  type OpportuniteRow,
} from '@/lib/opportunites/dto'
import type { ApiResponse } from '@/types/api'

/** Inclusions Prisma — table mère + relations polymorphiques + jonctions. */
const EXPORT_INCLUDE = {
  typeRef: true,
  programme: true,
  emploi: true,
  stage: true,
  formation: true,
  bourse: true,
  concours: true,
  appelAProjets: true,
  financement: true,
  mentorat: true,
  mobilite: true,
  volontariat: true,
  skills: { include: { skill: true } },
  tags: { include: { tag: true } },
} as const

type ExportResponse = NextResponse<ApiResponse<OpportuniteExportDTO[]>>

export async function GET(request: NextRequest): Promise<ExportResponse> {
  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!process.env.DATAHUB_API_KEY || apiKey !== process.env.DATAHUB_API_KEY) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Clé API invalide' } },
      { status: 401 },
    ) as ExportResponse
  }

  // Pagination optionnelle (`limit` / `offset`) — défauts conservateurs pour BI.
  const url = request.nextUrl
  const limit = Math.min(Math.max(1, Number(url.searchParams.get('limit')) || 500), 1000)
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0)

  const [rows, total] = await Promise.all([
    prisma.opportunite.findMany({
      where: { deletedAt: null },
      include: EXPORT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.opportunite.count({ where: { deletedAt: null } }),
  ])

  const data = toOpportuniteExportDTOArray(rows as OpportuniteRow[])
  return NextResponse.json({
    data,
    meta: { total, generated_at: new Date().toISOString() },
  }) as ExportResponse
}
