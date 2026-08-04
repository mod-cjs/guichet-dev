import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { erreurServeur } from '@/lib/observability/erreur-serveur'

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
 *
 * GUIC-689 (F-5) — Next.js applique les headers globaux de `next.config.ts`
 * (`headers()`) via `res.setHeader` AVANT d'invoquer le handler de route ; un
 * header explicitement reposé par LE HANDLER remplace ensuite cette valeur
 * (sémantique `setHeader` standard : dernier écrivain gagnant, par nom). La
 * réponse de succès (fin de fichier) reposait déjà `frame-ancestors 'self'`,
 * mais AUCUNE des branches d'erreur (404/415/502) ne le faisait : elles
 * héritaient donc du `frame-ancestors 'none'` global, ce qui fait échouer le
 * cadrage de l'iframe `PdfViewer` avec une violation CSP dès que le proxy
 * échoue. `withFrameFriendlyHeaders` applique le même override sur TOUTE
 * réponse quittant cette route, succès ou erreur.
 */
const FRAME_FRIENDLY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "frame-ancestors 'self'",
}

function withFrameFriendlyHeaders<T extends NextResponse>(response: T): T {
  for (const [key, value] of Object.entries(FRAME_FRIENDLY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 15,
    keyPrefix: 'ressource-proxy',
  })
  if (limited) return withFrameFriendlyHeaders(limited)

  const { id } = await params

  const ressource = await prisma.ressource.findFirst({
    where: { id, estPublic: true },
    select: { url: true, type: true, titre: true },
  })
  if (!ressource) {
    return withFrameFriendlyHeaders(
      NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Ressource introuvable.' } },
        { status: 404 },
      ),
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(ressource.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 GuichetJeunesseProxy/1.0' },
      redirect: 'follow',
    })
  } catch (err) {
    // GUIC-574 — le `catch {}` d'origine jetait la cause SANS MÊME LA LIER : une source distante
    // injoignable produisait un 502 totalement muet. On la journalise désormais (jamais au client).
    return withFrameFriendlyHeaders(
      erreurServeur({
        code:    'UPSTREAM',
        status:  502,
        message: 'Source distante injoignable.',
        cause:   err,
        route:   request.nextUrl.pathname,
      }),
    )
  }

  if (!upstream.ok || !upstream.body) {
    return withFrameFriendlyHeaders(
      erreurServeur({
        code:    'UPSTREAM',
        status:  502,
        message: 'Source distante en erreur.',
        // Le statut amont est LA donnée de diagnostic : 404 (lien mort) et 403 (accès refusé)
        // appellent des corrections très différentes.
        cause:   `amont ${upstream.status} ${upstream.statusText} sur ${ressource.url}`,
        route:   request.nextUrl.pathname,
      }),
    )
  }

  const download = request.nextUrl.searchParams.get('download') === '1'
  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'

  // La visionneuse inline attend un PDF. Si la source ne sert PAS un PDF (lien
  // périmé, page HTML/portail, redirection consentement…), on renvoie une erreur
  // plutôt que d'embarquer une page web cassée : le PdfViewer affiche alors son
  // fallback « télécharger / ouvrir dans un nouvel onglet ». (Le téléchargement
  // explicite `?download=1` reste autorisé tel quel.)
  if (!download && ressource.type === 'PDF' && !contentType.toLowerCase().includes('pdf')) {
    return withFrameFriendlyHeaders(
      NextResponse.json(
        { error: { code: 'NOT_A_PDF', message: 'La source ne fournit pas un fichier PDF affichable.' } },
        { status: 415 },
      ),
    )
  }

  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=3600',
    // GUIC-375 — Override explicite des headers anti-iframe globaux du
    // `next.config.ts` pour cette route : on DOIT pouvoir embed le PDF dans
    // notre propre PdfViewer. SAMEORIGIN + frame-ancestors 'self' = OK.
    ...FRAME_FRIENDLY_HEADERS,
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
