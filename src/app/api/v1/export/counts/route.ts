/**
 * M13 / Data Hub — réconciliation des comptages (lot 5, spec §8.4).
 *
 * POURQUOI CET ENDPOINT EXISTE
 * « Le pipeline n'a pas planté » et « le pipeline a tout extrait » sont deux choses
 * différentes, et la seconde ne se déduit pas de la première. Une extraction incrémentale
 * mal bornée se termine proprement en ayant perdu des lignes — c'est son mode de
 * défaillance normal, silencieux par construction. Comparer ces comptages à ceux de
 * l'entrepôt sur la MÊME fenêtre est le seul moyen de le savoir.
 *
 * NOMMAGE — la spec parlait de `_counts`. Impossible : dans l'App Router de Next.js, un
 * dossier préfixé par `_` est un dossier privé, exclu du routage. D'où `counts`, servi
 * avant le segment dynamique par précédence des segments statiques.
 *
 * COÛT — sans borne, chaque comptage parcourt l'index entier du flux. Sur `consultations`
 * c'est lent. L'usage attendu est `?since=` sur la fenêtre du run, qui exploite l'index
 * composite posé au lot 1.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { authenticateDatahub } from '@/lib/datahub/auth'
import { allDescriptors } from '@/lib/datahub/descriptor'
import { parseSince, BadSinceError } from '@/lib/datahub/since'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const FENETRE_MS = 60_000
const APPELS_PAR_FENETRE = 60

interface CountDelegate {
  count(args: { where: Record<string, unknown> }): Promise<number>
}

function erreur(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const consommateur = authenticateDatahub(request.headers.get('authorization'))
  if (!consommateur) return erreur('UNAUTHORIZED', 'Clé API invalide', 401)

  const limite = await rateLimit(request, {
    windowMs: FENETRE_MS,
    max: APPELS_PAR_FENETRE,
    authenticated: true,
    keyPrefix: `datahub-counts:${consommateur.id}`,
  })
  if (limite) return limite

  const brut = request.nextUrl.searchParams.get('since')
  let since: Date | null
  try {
    since = parseSince(brut)
  } catch (e) {
    if (e instanceof BadSinceError) return erreur('BORNE_INVALIDE', e.message, 400)
    throw e
  }

  const data: Record<string, number> = {}
  for (const descriptor of allDescriptors()) {
    const cle = descriptor.model.charAt(0).toLowerCase() + descriptor.model.slice(1)
    const delegate = (prisma as unknown as Record<string, CountDelegate>)[cle]
    // La borne porte sur la colonne de réplication DU FLUX : appliquer `createdAt`
    // partout comparerait des fenêtres différentes de celles réellement extraites.
    data[descriptor.name] = await delegate.count({
      where: since ? { [descriptor.replicationKey]: { gte: since } } : {},
    })
  }

  return NextResponse.json(
    {
      data,
      meta: { since: brut, generated_at: new Date().toISOString() },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
