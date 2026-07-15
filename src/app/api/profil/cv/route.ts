import { NextRequest, NextResponse } from 'next/server'
import { stockage } from '@/lib/storage'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { ALLOWED_CV_MIME, MAX_CV_BYTES, RATE_LIMIT_UPLOAD } from '@/lib/constants/candidature'
import { assertPdfMagicBytes } from '@/lib/security/magic-bytes'
import type { ApiResponse } from '@/types/api'

/**
 * GUIC-223 / GUIC-224 — CV depuis profil (GET).
 * GUIC-365 — upload CV depuis le profil (POST) : upload Vercel Blob + persistance
 *  `ProfilJeune.cvUrl` (réutilisable depuis CandidatureModal).
 */
export interface ProfilCvResponse {
  cvUrl: string | null
  /** Nom déduit (vide pour l'instant — sera renseigné quand l'upload nommera le fichier). */
  name: string
  uploadedAt: string | null
}

const BLOB_CACHE_MAX_AGE_SEC = 60 * 60 * 24

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ProfilCvResponse>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  // Rate-limit léger par utilisateur (30/min/cjsUid).
  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: `profil-cv:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<ProfilCvResponse>>

  const profil = await prisma.profilJeune.findUnique({
    where: { cjsUid: session.cjsUid },
    select: { cvUrl: true, cvUploadedAt: true },
  })

  if (!profil || !profil.cvUrl) {
    return NextResponse.json({ data: { cvUrl: null, name: '', uploadedAt: null } })
  }

  return NextResponse.json({
    data: {
      cvUrl: profil.cvUrl,
      name: '',
      uploadedAt: profil.cvUploadedAt ? profil.cvUploadedAt.toISOString() : null,
    },
  })
}

/**
 * POST /api/profil/cv — upload du CV (PDF) et persistance dans `ProfilJeune.cvUrl`.
 * Réutilisé par `<SectionCv />` (GUIC-365). Mêmes garde-fous que `/api/upload/cv`.
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ProfilCvResponse>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: RATE_LIMIT_UPLOAD.windowMs,
    max:      RATE_LIMIT_UPLOAD.max,
    keyPrefix: `profil-cv-post:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<ProfilCvResponse>>

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

  if (!(ALLOWED_CV_MIME as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: { code: 'INVALID_MIME', message: `Format invalide (${ALLOWED_CV_MIME.join(', ')} requis)` } },
      { status: 400 },
    )
  }
  if (file.size > MAX_CV_BYTES) {
    return NextResponse.json(
      { error: { code: 'FILE_TOO_LARGE', message: `Fichier trop volumineux (max ${MAX_CV_BYTES / 1024 / 1024} MB)` } },
      { status: 400 },
    )
  }

  try {
    const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
    assertPdfMagicBytes(head)
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_FILE_CONTENT', message: "Le fichier n'est pas un PDF valide" } },
      { status: 400 },
    )
  }

  const safeName = (file.name || 'cv.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')
  const pathname = `profil-cv/${session.cjsUid}/${safeName}`

  try {
    // GUIC-565 — stockage objet actif (MinIO en prod OVH, Vercel Blob sur le miroir de dev).
    const depose = await stockage().televerser({
      chemin: pathname,
      fichier: file,
      cacheMaxAgeSec: BLOB_CACHE_MAX_AGE_SEC,
      // Comportement d'origine préservé (cf. GUIC-565) — mais un CV en `public` est
      // accessible à qui connaît son URL : sujet CDP à trancher, pas à changer en douce ici.
      acces: 'public',
    })

    const updated = await prisma.profilJeune.upsert({
      where:  { cjsUid: session.cjsUid },
      create: { cjsUid: session.cjsUid, cvUrl: depose.reference, cvUploadedAt: new Date() },
      update: { cvUrl: depose.reference, cvUploadedAt: new Date() },
      select: { cvUrl: true, cvUploadedAt: true },
    })

    logger.info('[profil/cv] upload OK', { cjsUid: session.cjsUid })
    return NextResponse.json({
      data: {
        cvUrl: updated.cvUrl,
        name: safeName,
        uploadedAt: updated.cvUploadedAt ? updated.cvUploadedAt.toISOString() : null,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload impossible'
    logger.warn('[profil/cv] échec', { cjsUid: session.cjsUid, err: message })
    return NextResponse.json(
      { error: { code: 'UPLOAD_FAILED', message } },
      { status: 502 },
    )
  }
}
