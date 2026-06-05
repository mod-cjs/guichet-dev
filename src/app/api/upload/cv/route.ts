/**
 * GUIC-189 / GUIC-218 — Upload CV via Vercel Blob (handleUpload pattern).
 *
 * Le client appelle `upload(file, { handleUploadUrl: '/api/upload/cv' })` du SDK
 * `@vercel/blob/client`. Vercel Blob requête ici deux fois :
 *   1. `onBeforeGenerateToken` — on authentifie le user SSO + on contraint MIME/taille
 *   2. `onUploadCompleted` — callback informatif (no-op : on persiste l'URL via POST /api/candidatures)
 *
 * Sécurité (GUIC-218) :
 *   - Auth SSO obligatoire (cookie httpOnly)
 *   - MIME forcé : application/pdf
 *   - Taille max : 5 MiB
 *   - Rate-limit Redis : 5 upload/min/cjs_uid — `authenticated: true` (pas d'IP
 *     dans la clé, évite que plusieurs jeunes derrière le même NAT s'éjectent)
 *   - Pathname namespacé par cjs_uid + addRandomSuffix → un user ne peut écraser
 *     le CV d'un autre, ni deviner l'URL d'un CV existant
 *   - cacheControlMaxAge=24h : limite l'exposition d'un blob orphelin si le
 *     POST /api/candidatures n'arrive jamais
 *   - Logs sans PII : `cjsUid` est haché, l'URL complète n'est jamais loguée
 *
 * TODO (hors scope cette PR — créer ticket de suite) :
 *   - Cleanup périodique des blobs orphelins : `DELETE FROM blob WHERE pathname
 *     NOT IN (SELECT cv_url FROM candidatures WHERE cv_url IS NOT NULL)`. Vercel
 *     Blob n'expose pas de TTL natif, il faut un cron applicatif.
 */
import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { del } from '@vercel/blob'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { logger, hashId } from '@/lib/logger'
import { ALLOWED_CV_MIME, MAX_CV_BYTES, RATE_LIMIT_UPLOAD } from '@/lib/constants/candidature'
import { assertPdfMagicBytes } from '@/lib/security/magic-bytes'
import type { ApiResponse } from '@/types/api'

/** TTL minimum imposé côté Blob — limite l'exposition d'un orphelin à 24h. */
const BLOB_CACHE_MAX_AGE_SEC = 60 * 60 * 24

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: RATE_LIMIT_UPLOAD.windowMs,
    max: RATE_LIMIT_UPLOAD.max,
    keyPrefix: `upload-cv:${session.cjsUid}`,
    authenticated: true,
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
          allowedContentTypes: [...ALLOWED_CV_MIME],
          maximumSizeInBytes: MAX_CV_BYTES,
          addRandomSuffix: true,
          cacheControlMaxAge: BLOB_CACHE_MAX_AGE_SEC,
          tokenPayload: JSON.stringify({ cjsUidHash: hashId(session.cjsUid) }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // GUIC-241 — Magic-bytes : `application/pdf` annoncé client n'est jamais
        // une preuve. Un fichier texte renommé `cv.pdf` passerait sinon le filtre
        // MIME et serait stocké tel quel → vecteur XSS futur (signed URL recruteur).
        // On télécharge les 5 premiers octets via HTTP Range et on supprime le
        // blob si l'en-tête %PDF- est absent.
        const blobUrl = typeof blob === 'object' && blob !== null && 'url' in blob
          ? (blob as { url?: string }).url
          : undefined
        if (blobUrl) {
          try {
            const headResp = await fetch(blobUrl, { headers: { Range: 'bytes=0-7' } })
            const buf      = new Uint8Array(await headResp.arrayBuffer())
            assertPdfMagicBytes(buf)
          } catch (err) {
            await del(blobUrl).catch(() => {})
            logger.warn('[upload/cv] magic-bytes mismatch — blob supprimé', {
              cjsUidHash: tokenPayload,
              err: err instanceof Error ? err.message : String(err),
            })
            // Vercel Blob ne propage pas cette exception au client — c'est ok,
            // POST /api/candidatures rejettera ensuite la cvUrl orpheline (404).
            throw new Error('INVALID_FILE_CONTENT')
          }
        }
        // Pas de DB write ici : l'URL est persistée via POST /api/candidatures.
        // Log uniquement la taille et un hash du cjs_uid — pas l'URL (PII).
        logger.info('[upload/cv] terminé', {
          cjsUidHash: tokenPayload,
          sizeBytes: typeof blob === 'object' && blob !== null && 'size' in blob ? (blob as { size?: number }).size : undefined,
        })
      },
    })
    return NextResponse.json(json as never)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload impossible'
    logger.warn('[upload/cv] refusé', {
      cjsUidHash: hashId(session.cjsUid),
      err: message,
    })
    return NextResponse.json(
      { error: { code: 'UPLOAD_FAILED', message } },
      { status: 400 },
    )
  }
}
