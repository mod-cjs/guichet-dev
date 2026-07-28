import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/types/api'

/**
 * M13 — Export Data Hub des programmes sectoriels (GUIC-684).
 *
 * La route était un stub `data: []` en attente du modèle de données. Le modèle
 * existe (table `Programme`) et porte désormais des rattachements M:N vers les
 * opportunités, ressources et événements : les compteurs sont la valeur ajoutée
 * de cet export — sans eux, le Data Hub ne sait pas ce que pèse chaque programme.
 *
 * GARDE DURCIE (cf. GUIC-631) : la forme faible `apiKey !== process.env.X` accorde
 * l'accès quand la variable est ABSENTE et qu'aucun en-tête n'est envoyé
 * (`undefined !== undefined` est faux) — cas déjà vécu sur un environnement où la
 * variable n'avait pas été propagée. On refuse explicitement si elle n'est pas
 * configurée côté serveur.
 */

export interface ProgrammeExportDTO {
  id: string
  slug: string
  nom: string
  description: string
  actif: boolean
  opportunites_count: number
  ressources_count: number
  evenements_count: number
  created_at: string
  updated_at: string
}

type ExportResponse = NextResponse<ApiResponse<ProgrammeExportDTO[]>>

export async function GET(request: NextRequest): Promise<ExportResponse> {
  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!process.env.DATAHUB_API_KEY || apiKey !== process.env.DATAHUB_API_KEY) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Clé API invalide' } },
      { status: 401 },
    ) as ExportResponse
  }

  const rows = await prisma.programme.findMany({
    orderBy: { nom: 'asc' },
    select: {
      id: true,
      slug: true,
      nom: true,
      description: true,
      actif: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          opportuniteRattachements: true,
          ressourceRattachements: true,
          evenementRattachements: true,
        },
      },
    },
  })

  const data: ProgrammeExportDTO[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    nom: p.nom,
    description: p.description,
    actif: p.actif,
    opportunites_count: p._count.opportuniteRattachements,
    ressources_count: p._count.ressourceRattachements,
    evenements_count: p._count.evenementRattachements,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  }))

  return NextResponse.json({
    data,
    meta: { total: data.length, generated_at: new Date().toISOString() },
  }) as ExportResponse
}
