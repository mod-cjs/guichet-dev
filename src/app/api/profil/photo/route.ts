/**
 * POST /api/profil/photo — upload de la photo de profil (GUIC-360).
 *
 * Garde-fous :
 *  - Auth SSO obligatoire.
 *  - Rate limit Redis 5/min/cjsUid.
 *  - MIME whitelist (JPEG/PNG/WebP) + magic-bytes (GUIC-241).
 *  - Taille max 5 MB.
 *  - Stockage Vercel Blob (`profil-photo/<cjsUid>/...`).
 *  - Persistance `ProfilJeune.photoUrl`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

interface PhotoUploadResponse {
  photoUrl: string
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<PhotoUploadResponse>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: RATE_LIMIT_PROFIL_UPLOAD.windowMs,
    max:      RATE_LIMIT_PROFIL_UPLOAD.max,
    keyPrefix: `profil-photo:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<PhotoUploadResponse>>

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
      prefix: 'profil-photo',
      cjsUid: session.cjsUid,
      file:   validation.file,
    })

    await prisma.profilJeune.upsert({
      where:  { cjsUid: session.cjsUid },
      create: { cjsUid: session.cjsUid, photoUrl: blob.url },
      update: { photoUrl: blob.url },
    })

    logger.info('[profil/photo] upload OK', { cjsUid: session.cjsUid })
    return NextResponse.json({ data: { photoUrl: blob.url } }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload impossible'
    logger.warn('[profil/photo] échec', { cjsUid: session.cjsUid, err: message })
    return NextResponse.json(
      { error: { code: 'UPLOAD_FAILED', message } },
      { status: 502 },
    )
  }
}
