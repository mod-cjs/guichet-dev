import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'
import { clientHttpReel, UrlInterditeError } from '@/lib/curation/robot/http-client'
import { UrlSource } from '@/lib/curation/sources-veille-schema'
import { extraireOpportunite } from '@/lib/curation/extraction/extract'
import type { ApiResponse } from '@/types/api'

/**
 * GUIC-598 — US-3 : aperçu d'extraction (admin). « Coller une URL → voir ce qui est
 * extrait avant d'activer ». Fetch + extraction déterministe, SANS persistance.
 * RBAC admin. Anti-SSRF : validation d'URL (statique) + garde au fetch (dynamique).
 */

const ApercuSchema = z.object({
  url: UrlSource,
  typeDefautId: z.string().uuid().optional(),
  // Borné : un aperçu ne configure que quelques champs (anti-abus / anti-DoS).
  champs: z
    .record(z.string().max(200))
    .refine((o) => Object.keys(o).length <= 12, 'Trop de sélecteurs')
    .optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Authentification requise' } },
      { status: 401 },
    )
  }
  if (!isAdminRole(session.roles)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } },
      { status: 403 },
    )
  }

  // Rate-limit (fetch sortant piloté par l'appelant) : 20/min par admin.
  const limite = await rateLimit(request, {
    windowMs: 60_000,
    max: 20,
    keyPrefix: `apercu-veille:${session.cjsUid}`,
    authenticated: true,
  })
  if (limite) return limite as NextResponse<ApiResponse>

  const parsed = ApercuSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'URL invalide' } },
      { status: 400 },
    )
  }

  try {
    const res = await clientHttpReel()(parsed.data.url)
    if (res.statut < 200 || res.statut >= 300) {
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: `La source a répondu ${res.statut}.` } },
        { status: 422 },
      )
    }
    const resultat = extraireOpportunite(res.corps, {
      url: parsed.data.url,
      typeDefautId: parsed.data.typeDefautId,
      champs: parsed.data.champs,
    })
    return NextResponse.json({ data: resultat })
  } catch (err) {
    if (err instanceof UrlInterditeError) {
      return NextResponse.json(
        { error: { code: 'URL_INTERDITE', message: 'URL interne/non publique refusée.' } },
        { status: 400 },
      )
    }
    logger.error('[POST /api/admin/sources-veille/apercu] échec', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: { code: 'APERCU_FAILED', message: 'Impossible de récupérer/analyser la page.' } },
      { status: 422 },
    )
  }
}
