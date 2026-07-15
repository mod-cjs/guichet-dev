/**
 * POST /api/reservations/justif/upload — upload pièce justificative pour
 * réservation centre (GUIC-385).
 *
 * Pattern identique aux uploads profil (photo / diplôme / certificat) :
 * - Auth SSO obligatoire
 * - Rate-limit Redis 5/min/cjsUid
 * - Validation MIME + magic-bytes (PDF/JPG/PNG)
 * - Vercel Blob `access: 'private'` (lecture via proxy GET ci-dessous)
 * - Retourne `{ data: { url } }` à passer ensuite au POST /api/reservations
 *
 * Préfixe Blob : `reservation-justif/<cjsUid>/<ressourceId>/<timestamp>-<safeName>`.
 *
 * Avant ce fix : le formulaire envoyait `local://<filename>` → Zod url() refusait
 * → 400 silencieux pour le jeune. C'est ce qui causait l'erreur signalée par le PO.
 */

import { NextRequest, NextResponse } from 'next/server'
import { stockage } from '@/lib/storage'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_BYTES = 10 * 1024 * 1024

function magicOk(mime: string, head: Uint8Array): boolean {
  if (mime === 'application/pdf')
    return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46
  if (mime === 'image/jpeg')
    return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
  if (mime === 'image/png')
    return (
      head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
    )
  return false
}

interface UploadResponse {
  url: string
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<UploadResponse>>> {
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
    keyPrefix: `reservation-justif:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<UploadResponse>>

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const ressourceId = (form?.get('ressourceId') as string) ?? 'unknown'

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Fichier manquant' } },
      { status: 400 },
    )
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_MIME',
          message: 'Format invalide (PDF, JPEG ou PNG).',
        },
      },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: 'TOO_LARGE',
          message: 'Fichier trop volumineux (10 Mo max).',
        },
      },
      { status: 400 },
    )
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!magicOk(file.type, head)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_CONTENT',
          message: 'Le contenu du fichier ne correspond pas au format déclaré.',
        },
      },
      { status: 400 },
    )
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 100)
  const pathname = `reservation-justif/${session.cjsUid}/${ressourceId}/${Date.now()}-${safeName}`

  try {
    // GUIC-565 — stockage objet actif (MinIO en prod OVH, Vercel Blob sur le miroir de dev).
    const depose = await stockage().televerser({ chemin: pathname, fichier: file })
    return NextResponse.json({ data: { url: depose.reference } })
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Échec de l’upload, réessaye.',
        },
      },
      { status: 502 },
    )
  }
}
