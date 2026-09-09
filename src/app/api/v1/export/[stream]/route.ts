/**
 * M13 / Data Hub — route d'export unique, pilotée par le contrat (lot 5, spec §8.1).
 *
 * Une seule route sert tous les flux déclarés dans `src/lib/datahub/streams.ts`. Ajouter un
 * flux au Data Hub ne demande donc pas d'écrire une route : le contrat suffit, et il est
 * vérifié par `tsc` et par les gardes CDP.
 *
 * PRÉCÉDENCE NEXT.JS — un segment STATIQUE l'emporte sur le segment dynamique : tout
 * dossier `src/app/api/v1/export/<nom>/` masquerait silencieusement cette route pour ce
 * flux. `counts` (endpoint de service, pas un flux) est le seul réservé — voir
 * `tests/unit/datahub-routage.test.ts`, qui échoue si un nom de flux redevient un dossier
 * statique. Les anciennes routes `opportunites` et `programmes` (DTO polymorphe aplati,
 * compteurs de rattachement) ont été retirées au commit `b2128682` : ce commentaire les
 * décrivait encore comme actives (GUIC-697 D3), en contradiction avec le répertoire réel.
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
import { fullTableDescriptorFor } from '@/lib/datahub/full-table-descriptor'
import { fullTableExport } from '@/lib/datahub/full-table-export'
import { BadCursorError } from '@/lib/datahub/cursor'
import { parseSince, BadSinceError } from '@/lib/datahub/since'

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
  const url = request.nextUrl.searchParams
  const descriptor = descriptorFor(stream)
  // GUIC-700 lot 7 — un flux FULL_TABLE (jonctions programmes) n'a ni watermark ni clé
  // primaire simple : le registre incrémental ne le connaît pas et son absence ne doit
  // pas se traduire par un 404 avant d'avoir cherché dans le second registre.
  const fullTableDescriptor = descriptor ? null : fullTableDescriptorFor(stream)

  if (!descriptor && !fullTableDescriptor) {
    return erreur('STREAM_INCONNU', `Flux inconnu : ${stream}`, 404)
  }

  const delegate = delegateFor((descriptor ?? fullTableDescriptor!).model)
  if (!delegate) {
    return erreur('MODELE_INDISPONIBLE', `Modèle non exposé : ${(descriptor ?? fullTableDescriptor!).model}`, 500)
  }

  let page
  try {
    if (fullTableDescriptor) {
      // Aucun `since` pour un flux FULL_TABLE — pas de watermark, par construction
      // (GUIC-700 lot 7) : `parseSince` ne s'applique qu'au chemin incrémental.
      page = await fullTableExport(
        fullTableDescriptor,
        {
          cursor: url.get('cursor'),
          limit: url.get('limit') === null ? null : Number(url.get('limit')),
        },
        delegate
      )
    } else {
      // Validée AVANT keysetExport, avec la même règle que `counts` (S3) : une borne
      // illisible ne doit jamais dégénérer en 500, et une date hors plage MariaDB ne
      // doit jamais être acceptée en silence (S2 — sinon la requête posée au driver ne
      // filtre plus rien, et l'API rend 200 avec les premières lignes du flux, comme si
      // `since` était absent).
      parseSince(url.get('since'))
      page = await keysetExport(
        descriptor!,
        {
          since: url.get('since'),
          cursor: url.get('cursor'),
          limit: url.get('limit') === null ? null : Number(url.get('limit')),
        },
        delegate
      )
    }
  } catch (e) {
    if (e instanceof BadSinceError) return erreur('BORNE_INVALIDE', e.message, 400)
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
