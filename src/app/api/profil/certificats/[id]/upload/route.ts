/**
 * POST /api/profil/certificats/[id]/upload — joint le scan du certificat (GUIC-360).
 *
 * Mêmes garde-fous que diplomes/[id]/upload.
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

interface CertifUploadResponse {
  certificatId: string
  fichierUrl:   string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<CertifUploadResponse>>> {
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
    keyPrefix: `profil-certif-upload:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<CertifUploadResponse>>

  const { id } = await params
  const owns = await prisma.certificatMoodle.findFirst({
    where:  { id, profil: { cjsUid: session.cjsUid } },
    select: { id: true },
  })
  if (!owns) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Certificat introuvable' } },
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
      prefix: 'certif-scan',
      cjsUid: session.cjsUid,
      subKey: id,
      file:   validation.file,
    })

    await prisma.certificatMoodle.update({
      where: { id },
      data:  { fichierUrl: blob.url },
    })

    logger.info('[profil/certificat/upload] OK', { cjsUid: session.cjsUid, certificatId: id })
    return NextResponse.json(
      { data: { certificatId: id, fichierUrl: blob.url } },
      { status: 200 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload impossible'
    logger.warn('[profil/certificat/upload] échec', { cjsUid: session.cjsUid, err: message })
    return NextResponse.json(
      { error: { code: 'UPLOAD_FAILED', message } },
      { status: 502 },
    )
  }
}
