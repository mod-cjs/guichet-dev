/**
 * M13 / Data Hub — route d'export unique, pilotée par le contrat (lot 5, spec §8.1).
 *
 * Une seule route sert tous les flux déclarés dans `src/lib/datahub/streams.ts`. Ajouter un
 * flux au Data Hub ne demande donc pas d'écrire une route : le contrat suffit, et il est
 * vérifié par `tsc` et par les gardes CDP.
 *
 * PRÉCÉDENCE NEXT.JS — les segments statiques l'emportent sur le segment dynamique. Les
 * routes historiques `opportunites` et `programmes` gardent donc la main sur leur nom :
 * elles portent du contenu que le contrat ne reproduit pas (colonnes polymorphes aplaties
 * pour la première, compteurs de rattachement pour la seconde). Leur retrait demande un
 * arbitrage, pas un remplacement silencieux.
 *
 * `force-dynamic` n'est pas cosmétique : sans lui Next.js peut servir une réponse en cache
 * et le tap boucle indéfiniment sur la même page.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { recordAudit } from '@/lib/audit'
import { authenticateDatahub } from '@/lib/datahub/auth'
import { descriptorFor } from '@/lib/datahub/descriptor'
import { keysetExport, type FindManyDelegate } from '@/lib/datahub/keyset'
import { BadCursorError } from '@/lib/datahub/cursor'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Quota par consommateur, pas par IP : un tap paginant 1000 pages n'est pas un abus. */
const FENETRE_MS = 60_000
const APPELS_PAR_FENETRE = 300

function erreur(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } })
}

/** Délégué Prisma d'un modèle — `Utilisateur` → `prisma.utilisateur`. */
function delegateFor(model: string): FindManyDelegate | null {
  const cle = model.charAt(0).toLowerCase() + model.slice(1)
  const delegate = (prisma as unknown as Record<string, unknown>)[cle]
  if (!delegate || typeof (delegate as FindManyDelegate).findMany !== 'function') return null
  return delegate as FindManyDelegate
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stream: string }> }
): Promise<NextResponse> {
  const consommateur = authenticateDatahub(request.headers.get('authorization'))
  if (!consommateur) {
    return erreur('UNAUTHORIZED', 'Clé API invalide', 401)
  }

  const limite = await rateLimit(request, {
    windowMs: FENETRE_MS,
    max: APPELS_PAR_FENETRE,
    authenticated: true,
    keyPrefix: `datahub:${consommateur.id}`,
  })
  if (limite) return limite

  const { stream } = await params
  const descriptor = descriptorFor(stream)
  if (!descriptor) {
    return erreur('STREAM_INCONNU', `Flux inconnu : ${stream}`, 404)
  }

  const delegate = delegateFor(descriptor.model)
  if (!delegate) {
    return erreur('MODELE_INDISPONIBLE', `Modèle non exposé : ${descriptor.model}`, 500)
  }

  const url = request.nextUrl.searchParams
  let page
  try {
    page = await keysetExport(
      descriptor,
      {
        since: url.get('since'),
        cursor: url.get('cursor'),
        limit: url.get('limit') === null ? null : Number(url.get('limit')),
      },
      delegate
    )
  } catch (e) {
    if (e instanceof BadCursorError) return erreur('CURSEUR_INVALIDE', e.message, 400)
    throw e
  }

  // Traçabilité CDP des accès (fail-soft : n'interrompt jamais l'extraction).
  await recordAudit(`datahub:${consommateur.id}`, `export.${stream}`, {
    targetType: 'datahub_stream',
    targetId: stream,
    meta: {
      lignes: page.data.length,
      since: url.get('since'),
      paginee: page.meta.has_more,
    },
  })

  return NextResponse.json(page, { headers: { 'Cache-Control': 'no-store' } })
}
