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
import { logger } from '@/lib/logger'
import { stockagePour, type ContenuObjet } from '@/lib/storage'
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
 * GUIC-565 — Stream au client le contenu d'un fichier privé, quel que soit le stockage.
 *
 * Le fournisseur est résolu sur la FORME de la référence, jamais sur le pilote actif :
 * une URL `https://…` est lue par Vercel Blob, une référence `s3://…` par MinIO. C'est ce
 * qui garantit que les CV, photos et diplômes DÉJÀ déposés sur Vercel restent lisibles
 * après la bascule du serveur — sans quoi on rendrait inaccessibles les pièces jointes de
 * milliers de jeunes.
 *
 * L'application reste le gardien : elle a vérifié l'autorisation avant d'arriver ici, et le
 * client ne voit jamais ni jeton ni URL de stockage (CDP).
 */
async function proxyPrivateBlob(reference: string): Promise<NextResponse> {
  let contenu: ContenuObjet
  try {
    contenu = await stockagePour(reference).lire(reference)
  } catch (err) {
    logger.error('lecture du fichier privé échouée', {
      reference: reference.slice(0, 60),
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: { code: 'UPSTREAM_ERROR', message: 'Fichier illisible' } },
      { status: 502 },
    )
  }

  const headers = new Headers({
    'Content-Type': contenu.contentType,
    'Cache-Control': 'private, max-age=300',
  })
  if (contenu.taille) headers.set('Content-Length', String(contenu.taille))

  return new NextResponse(contenu.corps, { status: 200, headers })
}

export { proxyPrivateBlob }
