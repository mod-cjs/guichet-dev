/**
 * POST /api/upload/image — upload d'une image pour l'éditeur de texte riche (GUIC-504).
 *
 * Utilisé par `RichTextEditor` dans les espaces admin & recruteur (descriptions
 * d'opportunités, offres, événements, ressources, partenaires…).
 *
 * Garde-fous :
 *  - Auth SSO obligatoire, réservée aux rôles admin OU recruteur (contenu éditorial).
 *  - Rate limit Redis 5/min/cjsUid.
 *  - MIME whitelist (JPEG/PNG/WebP) + magic-bytes.
 *  - Taille max 5 MB.
 *  - Stockage Vercel Blob PUBLIC (`editor-image/<cjsUid>/...`) — URL rendue par `<img>`
 *    (whitelistée CSP + sanitizer). Aucun effet de bord en base.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import {
  ALLOWED_PHOTO_MIME,
  MAX_PHOTO_BYTES,
  RATE_LIMIT_PROFIL_UPLOAD,
  parseAndValidateUpload,
  uploadToBlob,
} from '@/lib/upload/profil-uploads'
import type { ApiResponse } from '@/types/api'

interface ImageUploadResponse {
  url: string
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ImageUploadResponse>>> {
  const session = await getSession(request)
  // Réservé aux producteurs de contenu éditorial : admin ou recruteur.
  if (!session || !(isAdminRole(session.roles) || session.roles.includes('recruteur'))) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Action réservée aux administrateurs et recruteurs.' } },
      { status: session ? 403 : 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: RATE_LIMIT_PROFIL_UPLOAD.windowMs,
    max:      RATE_LIMIT_PROFIL_UPLOAD.max,
    keyPrefix: `editor-image:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<ImageUploadResponse>>

  const validation = await parseAndValidateUpload(request, {
    allowedMimes: ALLOWED_PHOTO_MIME,
    maxBytes:     MAX_PHOTO_BYTES,
  })
  if (!validation.ok) {
    return NextResponse.json(
      { error: { code: validation.code, message: validation.message } },
      { status: validation.status },
    )
  }

  try {
    const blob = await uploadToBlob({
      prefix: 'editor-image',
      cjsUid: session.cjsUid,
      file:   validation.file,
    })
    logger.info('[upload/image] upload OK', { cjsUid: session.cjsUid })
    return NextResponse.json({ data: { url: blob.url } }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload impossible'
    logger.warn('[upload/image] échec', { cjsUid: session.cjsUid, err: message })
    return NextResponse.json(
      { error: { code: 'UPLOAD_FAILED', message } },
      { status: 502 },
    )
  }
}
