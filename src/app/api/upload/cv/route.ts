/**
 * POST /api/upload/cv — proxy serveur d'upload CV vers Vercel Blob (GUIC-225).
 *
 * Pourquoi un proxy serveur (option B, audit GUIC-189) :
 *   - Le client (`CandidatureModal.defaultUploader`) envoie un `multipart/form-data`.
 *   - L'implémentation précédente utilisait `handleUpload()` de `@vercel/blob/client`,
 *     qui attend un body JSON `HandleUploadBody` et appelle `request.json()` —
 *     d'où un 400 systématique sur FormData.
 *   - Solution : parser le FormData côté serveur et appeler `put()` directement
 *     (`@vercel/blob`, côté serveur). Plus simple, contrôle complet, pas de
 *     besoin d'élargir la CSP côté client.
 *
 * Garde-fous métier :
 *   - Auth SSO obligatoire (cookie `cjs_session`).
 *   - Rate limit Redis par `cjs_uid` (cf. `RATE_LIMIT_UPLOAD`).
 *   - MIME whitelist `ALLOWED_CV_MIME` (PDF uniquement aujourd'hui).
 *   - Taille max `MAX_CV_BYTES` (5 MiB).
 *   - Nom de fichier sanitizé (regex `[^a-zA-Z0-9._-]` → `_`), pathname
 *     préfixé `cv/<cjsUid>/<safeName>` et `addRandomSuffix: true` pour
 *     éviter les collisions et le squat de chemin.
 *   - `cacheControlMaxAge` de 24h : limite l'exposition d'éventuels blobs
 *     orphelins (candidature jamais soumise) côté CDN sans pour autant
 *     casser la lecture pendant le parcours utilisateur.
 */

import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import {
  ALLOWED_CV_MIME,
  MAX_CV_BYTES,
  RATE_LIMIT_UPLOAD,
} from '@/lib/constants/candidature'
import type { ApiResponse } from '@/types/api'

/** Réponse renvoyée au client en cas de succès (cf. `UploadedFileMeta`). */
interface UploadedFileMeta {
  url: string
  name: string
  sizeKb: number
}

/** TTL CDN court (24h) pour limiter l'exposition des blobs orphelins. */
const BLOB_CACHE_MAX_AGE_SEC = 60 * 60 * 24

/** Empreinte SHA-256 tronquée d'un identifiant pour les logs (anti-PII). */
async function hashId(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<UploadedFileMeta>>> {
  // 1. Auth — cookie SSO requis.
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  // 2. Pré-check : token Blob configuré ? (sinon `put()` throw cryptiquement)
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    logger.error('[upload/cv] BLOB_READ_WRITE_TOKEN absent — variable Vercel Blob non configurée')
    return NextResponse.json(
      {
        error: {
          code: 'BLOB_NOT_CONFIGURED',
          message: 'Service de stockage non configuré. Contactez le support.',
        },
      },
      { status: 503 },
    )
  }

  // 3. Rate limit Redis par cjs_uid — catch pour distinguer Redis down (503) du throw Blob (502).
  try {
    const limited = await rateLimit(request, {
      windowMs: RATE_LIMIT_UPLOAD.windowMs,
      max: RATE_LIMIT_UPLOAD.max,
      keyPrefix: `upload-cv:${session.cjsUid}`,
    })
    if (limited) return limited as NextResponse<ApiResponse<UploadedFileMeta>>
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Redis indisponible'
    logger.error('[upload/cv] rate-limit Redis indisponible', { err: message })
    // Soft-fail : on laisse passer (ne pas bloquer l'utilisateur si Redis tombe).
    // Le risque rate-limit est temporairement levé mais l'auth SSO reste obligatoire.
  }

  // 3. Parse FormData (et non JSON — c'est précisément la cause du bug d'origine).
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'FormData attendu' } },
      { status: 400 },
    )
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Champ "file" manquant' } },
      { status: 400 },
    )
  }

  // 4. Validation MIME + taille.
  if (!(ALLOWED_CV_MIME as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_MIME',
          message: `Format invalide (${ALLOWED_CV_MIME.join(', ')} requis)`,
        },
      },
      { status: 400 },
    )
  }
  if (file.size > MAX_CV_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: 'FILE_TOO_LARGE',
          message: `Fichier trop volumineux (max ${MAX_CV_BYTES / 1024 / 1024} MB)`,
        },
      },
      { status: 400 },
    )
  }

  // 5. Sanitize filename + namespacing cjsUid.
  const safeName = (file.name || 'cv.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')
  const pathname = `cv/${session.cjsUid}/${safeName}`

  // 6. Upload serveur → Vercel Blob.
  try {
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
      cacheControlMaxAge: BLOB_CACHE_MAX_AGE_SEC,
    })
    const sizeKb = Math.round(file.size / 1024)
    logger.info('[upload/cv] terminé', {
      cjsUidHash: await hashId(session.cjsUid),
      sizeBytes: file.size,
    })
    return NextResponse.json(
      { data: { url: blob.url, name: safeName, sizeKb } },
      { status: 200 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload impossible'
    const stack = err instanceof Error ? err.stack : undefined
    logger.error('[upload/cv] Blob put() failed', {
      cjsUidHash: await hashId(session.cjsUid),
      err: message,
      stack,
      pathname,
      sizeBytes: file.size,
    })
    return NextResponse.json(
      { error: { code: 'UPLOAD_FAILED', message } },
      { status: 502 },
    )
  }
}
