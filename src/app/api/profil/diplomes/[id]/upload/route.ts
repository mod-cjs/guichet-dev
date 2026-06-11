/**
 * POST /api/profil/diplomes/[id]/upload — joint le scan du diplôme (GUIC-360).
 *
 * Garde-fous :
 *  - Auth SSO obligatoire.
 *  - Vérification ownership (diplôme du jeune connecté).
 *  - Rate limit 5/min/cjsUid.
 *  - MIME PDF/JPEG/PNG/WebP + magic-bytes (GUIC-241).
 *  - Taille max 10 MB.
 *  - Stockage Vercel Blob (`diplome-scan/<cjsUid>/<diplomeId>/...`).
 *  - Persistance `Diplome.fichierUrl`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import {
  ALLOWED_DOC_MIME,
  MAX_DOC_BYTES,
  RATE_LIMIT_PROFIL_UPLOAD,
  parseAndValidateUpload,
  uploadToBlob,
} from '@/lib/upload/profil-uploads'
import type { ApiResponse } from '@/types/api'

interface DiplomeUploadResponse {
  diplomeId:  string
  fichierUrl: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<DiplomeUploadResponse>>> {
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
    keyPrefix: `profil-diplome-upload:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<DiplomeUploadResponse>>

  const { id } = await params
  const owns = await prisma.diplome.findFirst({
    where:  { id, profil: { cjsUid: session.cjsUid } },
    select: { id: true },
  })
  if (!owns) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Diplôme introuvable' } },
      { status: 404 },
    )
  }

  const validation = await parseAndValidateUpload(request, {
    allowedMimes: ALLOWED_DOC_MIME,
    maxBytes:     MAX_DOC_BYTES,
  })
  if (!validation.ok) {
    return NextResponse.json(
      { error: { code: validation.code, message: validation.message } },
      { status: validation.status },
    )
  }

  try {
    const blob = await uploadToBlob({
      prefix: 'diplome-scan',
      cjsUid: session.cjsUid,
      subKey: id,
      file:   validation.file,
    })

    await prisma.diplome.update({
      where: { id },
      data:  { fichierUrl: blob.url },
    })

    logger.info('[profil/diplome/upload] OK', { cjsUid: session.cjsUid, diplomeId: id })
    return NextResponse.json(
      { data: { diplomeId: id, fichierUrl: blob.url } },
      { status: 200 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload impossible'
    logger.warn('[profil/diplome/upload] échec', { cjsUid: session.cjsUid, err: message })
    return NextResponse.json(
      { error: { code: 'UPLOAD_FAILED', message } },
      { status: 502 },
    )
  }
}
