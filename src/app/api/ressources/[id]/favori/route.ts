import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

// GUIC-24 — M6 · Toggle favori sur une ressource.
//
// POST /api/ressources/[id]/favori
//  - Si le favori n'existe pas → le crée (favori=true, status 201).
//  - Sinon → le supprime (favori=false, status 200).
// Sémantique idempotente côté UI : un seul endpoint, l'état est renvoyé.

const UNAUTHORIZED = { code: 'UNAUTHORIZED', message: 'Non authentifié' }

interface ToggleResult {
  ressourceId: string
  favori: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ToggleResult>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: `ressource-favori:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<ToggleResult>>

  const { id } = await params

  // Vérification stricte du format UUID pour éviter requête inutile en base.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Identifiant invalide' } },
      { status: 400 },
    )
  }

  const ressource = await prisma.ressource.findUnique({
    where: { id },
    select: { id: true, estPublic: true },
  })
  if (!ressource || !ressource.estPublic) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Ressource introuvable' } },
      { status: 404 },
    )
  }

  const where = {
    cjsUid_ressourceId: { cjsUid: session.cjsUid, ressourceId: ressource.id },
  }
  const existing = await prisma.ressourceFavorite.findUnique({ where })

  if (existing) {
    await prisma.ressourceFavorite.delete({ where })
    return NextResponse.json({ data: { ressourceId: ressource.id, favori: false } })
  }

  await prisma.ressourceFavorite.create({
    data: { cjsUid: session.cjsUid, ressourceId: ressource.id },
  })
  return NextResponse.json(
    { data: { ressourceId: ressource.id, favori: true } },
    { status: 201 },
  )
}
