/**
 * GUIC-189 — Upload CV via Vercel Blob (handleUpload pattern).
 *
 * Le client appelle `upload(file, { handleUploadUrl: '/api/upload/cv' })` du SDK
 * `@vercel/blob/client`. Vercel Blob requête ici deux fois :
 *   1. `onBeforeGenerateToken` — on authentifie le user SSO + on contraint MIME/taille
 *   2. `onUploadCompleted` — callback informatif (no-op : on persiste l'URL via POST /api/candidatures)
 *
 * Sécurité :
 *   - Auth SSO obligatoire (cookie httpOnly)
 *   - MIME forcé : application/pdf
 *   - Taille max : 5 MiB
 *   - Rate-limit Redis : 5 upload/min/cjs_uid
 *   - Pathname namespacé par cjs_uid → un user ne peut écraser le CV d'un autre
 */
import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import type { ApiResponse } from '@/types/api'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = ['application/pdf']

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 5,
    keyPrefix: `upload-cv:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse>

  const body = (await request.json().catch(() => null)) as HandleUploadBody | null
  if (!body) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Corps invalide' } },
      { status: 400 },
    )
  }

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Garde-fou supplémentaire : pathname doit terminer en .pdf
        if (!pathname.toLowerCase().endsWith('.pdf')) {
          throw new Error('Seuls les fichiers PDF sont acceptés')
        }
        return {
          allowedContentTypes: ALLOWED_MIME,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ cjsUid: session.cjsUid }),
          // Namespacing automatique côté Blob — clé finale: cv/<cjsUid>/<file>-<rand>.pdf
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Pas de DB write ici : l'URL est persistée via POST /api/candidatures.
        // Ce callback sert au monitoring/observabilité.
        logger.info('[upload/cv] terminé', {
          url: blob.url,
          payload: tokenPayload,
        })
      },
    })
    return NextResponse.json(json as never)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload impossible'
    logger.warn('[upload/cv] refusé', { cjsUid: session.cjsUid, err: message })
    return NextResponse.json(
      { error: { code: 'UPLOAD_FAILED', message } },
      { status: 400 },
    )
  }
}
