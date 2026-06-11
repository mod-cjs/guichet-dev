/**
 * GET /api/profil/photo/file — proxy lecture privée de la photo de profil.
 *
 * GUIC-364 : Vercel Blob privé (access: 'private') nécessite un token pour
 * la lecture. Ce proxy injecte `BLOB_READ_WRITE_TOKEN` côté serveur, vérifie
 * l'authentification + ownership, puis stream le contenu binaire au client.
 *
 * Utilisé par `&lt;Image src="/api/profil/photo/file?cb={timestamp}" /&gt;` dans
 * `SectionIdentite` et `ProfilHeader` (avatar).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 60,
    keyPrefix: `profil-photo-read:${session.cjsUid}`,
  })
  if (limited) return limited

  const profil = await prisma.profilJeune.findUnique({
    where: { cjsUid: session.cjsUid },
    select: { photoUrl: true },
  })

  if (!profil?.photoUrl) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Pas de photo' } },
      { status: 404 },
    )
  }

  return await proxyPrivateBlob(profil.photoUrl)
}

/**
 * Stream le contenu d'un Blob privé Vercel au client en injectant le token.
 */
async function proxyPrivateBlob(blobUrl: string): Promise<NextResponse> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Token Blob manquant' } },
      { status: 500 },
    )
  }

  const upstream = await fetch(blobUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!upstream.ok) {
    return NextResponse.json(
      {
        error: {
          code: 'UPSTREAM_ERROR',
          message: `Blob fetch ${upstream.status}`,
        },
      },
      { status: 502 },
    )
  }

  const contentType =
    upstream.headers.get('content-type') ?? 'application/octet-stream'
  const contentLength = upstream.headers.get('content-length')

  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'private, max-age=300',
  })
  if (contentLength) headers.set('Content-Length', contentLength)

  return new NextResponse(upstream.body, { status: 200, headers })
}

export { proxyPrivateBlob }
