import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import {
  initierEmprunt,
  getEmpruntsActifs,
  BiblioDomainError,
  type EmpruntVue,
} from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * POST /api/bibliotheque/emprunts — initie un emprunt (statut `initie`) (GUIC-343).
 * GET  /api/bibliotheque/emprunts — emprunts actifs du bénéficiaire connecté.
 *
 * L'emprunt initié devient effectif (`en_cours`) au scan du badge au centre
 * (route `/confirmer`). Auth requise.
 *
 * Spec : .agent_context/specs/M4-bibliotheque.md §3.
 */

const InitierSchema = z.object({ exemplaireId: z.string().uuid() })

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ emprunt: EmpruntVue }>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 10,
    keyPrefix: `biblio-emprunt:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited as NextResponse<ApiResponse<{ emprunt: EmpruntVue }>>

  const parsed = InitierSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  try {
    const emprunt = await initierEmprunt({ cjsUid: session.cjsUid, exemplaireId: parsed.data.exemplaireId })
    return NextResponse.json({ data: { emprunt } }, { status: 201 })
  } catch (err) {
    if (err instanceof BiblioDomainError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      )
    }
    logger.error('[POST /api/bibliotheque/emprunts] échec', {
      error: err instanceof Error ? err.message : String(err),
      cjsUid: session.cjsUid,
    })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } },
      { status: 500 },
    )
  }
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ emprunts: EmpruntVue[] }>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  try {
    const emprunts = await getEmpruntsActifs(session.cjsUid)
    return NextResponse.json({ data: { emprunts }, meta: { total: emprunts.length } })
  } catch (err) {
    logger.error('[GET /api/bibliotheque/emprunts] échec', {
      error: err instanceof Error ? err.message : String(err),
      cjsUid: session.cjsUid,
    })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } },
      { status: 500 },
    )
  }
}
