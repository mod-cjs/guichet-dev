import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

/**
 * GUIC-374 — Proxy de fichier ressource (PDF principalement).
 *
 * Certains serveurs externes (ex. ADEPME) renvoient `X-Frame-Options: SAMEORIGIN`
 * ou `CSP frame-ancestors 'none'` qui bloquent l'embed dans notre `<iframe>`.
 * Cette route télécharge le fichier côté serveur et le re-sert depuis notre
 * domaine, ce qui contourne le blocage sans CORS ni dépendance JS exotique.
 *
 * - `?download=1` → force le téléchargement avec un nom dérivé du titre.
 * - Sans paramètre → `Content-Disposition: inline` pour usage dans le viewer.
 *
 * Rate-limit : 15 requêtes / min / IP pour éviter un proxy de masse.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 15,
    keyPrefix: 'ressource-proxy',
  })
  if (limited) return limited

  const { id } = await params

  const ressource = await prisma.ressource.findFirst({
    where: { id, estPublic: true },
    select: { url: true, type: true, titre: true },
  })
  if (!ressource) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Ressource introuvable.' } },
      { status: 404 },
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(ressource.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 GuichetJeunesseProxy/1.0' },
      redirect: 'follow',
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'UPSTREAM', message: 'Source distante injoignable.' } },
      { status: 502 },
    )
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: { code: 'UPSTREAM', message: 'Source distante en erreur.' } },
      { status: 502 },
    )
  }

  const download = request.nextUrl.searchParams.get('download') === '1'
  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'

  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=3600',
    // GUIC-375 — Override explicite des headers anti-iframe globaux du
    // `next.config.ts` pour cette route : on DOIT pouvoir embed le PDF dans
    // notre propre PdfViewer. SAMEORIGIN + frame-ancestors 'self' = OK.
    'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': "frame-ancestors 'self'",
  })
  const contentLength = upstream.headers.get('content-length')
  if (contentLength) headers.set('Content-Length', contentLength)

  if (download) {
    const safeName = ressource.titre.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 100)
    const ext = ressource.type === 'PDF' ? '.pdf' : ''
    headers.set('Content-Disposition', `attachment; filename="${safeName}${ext}"`)
  } else {
    headers.set('Content-Disposition', 'inline')
  }

  return new NextResponse(upstream.body, { status: 200, headers })
}
