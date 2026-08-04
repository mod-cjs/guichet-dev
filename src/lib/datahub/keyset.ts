/**
 * M13 / Data Hub — extraction paginée par curseur (lot 4, spec §8.2).
 *
 * TROIS INVARIANTS, ET LEUR RAISON D'ÊTRE
 *
 * 1. **Tri total `(watermark, clé primaire)`.** Un tri sur le seul watermark est partiel :
 *    les lignes portant le même horodatage ont un ordre indéfini, et le curseur se met à
 *    les relire en boucle ou à en sauter. La clé primaire les départage.
 *
 * 2. **Curseur positionnel, jamais un offset.** L'offset pagine par rang, et le rang bouge :
 *    une insertion pendant l'extraction décale les pages suivantes, et une ligne passe
 *    entre deux pages sans jamais être lue. Aucune erreur n'est levée.
 *
 * 3. **Borne `since` inclusive.** Le tap repart de son dernier point d'arrêt moins un
 *    recouvrement, parce que le watermark est posé à l'écriture applicative et non au
 *    commit : une transaction ouverte avant le point d'arrêt et committée après ne serait
 *    sinon jamais extraite. Les doublons produits sont absorbés par l'upsert de l'entrepôt.
 *
 * Aucun filtre sur la suppression logique : les lignes supprimées SORTENT, avec leur date
 * (spec §3, DA-5). Les filtrer laisserait des fantômes actifs dans l'entrepôt à jamais.
 */
import { decodeCursor, encodeCursor, BadCursorError } from './cursor'
import { projectRow, type StreamDescriptor } from './descriptor'
import { streams } from './streams'

/** Taille de page par défaut, et plafond. Au-delà, la réponse ne tient plus en mémoire. */
export const LIMIT_DEFAUT = 1000
export const LIMIT_MAX = 5000

export interface ExportParams {
  /** Borne basse inclusive sur le watermark, ISO 8601. Ignorée si un curseur est fourni. */
  since?: string | null
  cursor?: string | null
  limit?: number | null
}

export interface ExportPage {
  data: Record<string, unknown>[]
  meta: {
    next_cursor: string | null
    has_more: boolean
    replication_key: string
    generated_at: string
  }
}

/** Le strict nécessaire d'un délégué Prisma — injecté pour rendre la construction testable. */
export interface FindManyDelegate {
  findMany(args: {
    where: Record<string, unknown>
    select: Record<string, true>
    orderBy: Array<Record<string, 'asc'>>
    take: number
  }): Promise<Record<string, unknown>[]>
}

function borneLimit(demande: number | null | undefined): number {
  if (typeof demande !== 'number' || Number.isNaN(demande)) return LIMIT_DEFAUT
  return Math.min(Math.max(1, Math.floor(demande)), LIMIT_MAX)
}

/** Chiffres uniquement, au moins un — exclut le vide, l'hexadécimal, le signe, les espaces. */
const CLE_BIGINT_RE = /^\d+$/

/**
 * Nature déclarée de la clé primaire — voir `StreamSpec.primaryKeyKind`.
 *
 * `BigInt()` est permissif au-delà de ce qu'un curseur légitime produit jamais :
 * `BigInt('')` vaut `0n` (repositionnerait sur `id > 0`, rejeu complet silencieux) et
 * `BigInt('0x10')` vaut `16n` (conversion hexadécimale silencieuse). Le format est donc
 * validé AVANT l'appel, pas seulement son succès (GUIC-696 S4).
 */
function convertirCle(descriptor: StreamDescriptor, valeur: string): string | bigint {
  const spec = streams[descriptor.name as keyof typeof streams] as { primaryKeyKind?: string }
  if (spec?.primaryKeyKind !== 'bigint') return valeur
  if (!CLE_BIGINT_RE.test(valeur)) {
    // Erreur TYPÉE : un `Error` nu échapperait au seul filtre que la route applique
    // (`instanceof BadCursorError`) et rendrait 500 — retriable pour le SDK Singer, qui
    // épuise ses tentatives avant d'abandonner le run entier.
    throw new BadCursorError(`clé primaire non numérique pour ${descriptor.name} : « ${valeur} »`)
  }
  return BigInt(valeur)
}

export async function keysetExport(
  descriptor: StreamDescriptor,
  params: ExportParams,
  delegate: FindManyDelegate
): Promise<ExportPage> {
  const limit = borneLimit(params.limit)
  const { replicationKey: rk, primaryKey: pk } = descriptor

  let where: Record<string, unknown> = {}
  if (params.cursor) {
    // Le curseur est décodé AVANT toute requête : un curseur malformé ne doit jamais
    // dégénérer en scan de table entière.
    const position = decodeCursor(params.cursor)
    const t = new Date(position.t)
    where = {
      OR: [{ [rk]: { gt: t } }, { [rk]: t, [pk]: { gt: convertirCle(descriptor, position.i) } }],
    }
  } else if (params.since) {
    where = { [rk]: { gte: new Date(params.since) } }
  }

  const rows = await delegate.findMany({
    where,
    select: descriptor.select,
    orderBy: descriptor.orderBy,
    take: limit + 1,
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const derniere = page.at(-1)

  // Nom EXPORTÉ de la clé de réplication (GUIC-697 D1) — `data[]` porte déjà `column.as`
  // (ex. `updated_at`), annoncer le nom Prisma (`rk`, ex. `updatedAt`) décrirait une
  // colonne absente de cette réponse pour tout consommateur qui suit ce contrat.
  const replicationKeyExportee = descriptor.columns.find((c) => c.field === rk)?.as ?? rk

  return {
    data: page.map((row) => projectRow(descriptor, row)),
    meta: {
      // Positionné sur la dernière ligne SERVIE : pointer la ligne de sonde ferait sauter
      // celle-ci à la page suivante.
      next_cursor:
        hasMore && derniere
          ? encodeCursor({
              t: (derniere[rk] as Date).toISOString(),
              i: String(derniere[pk]),
            })
          : null,
      has_more: hasMore,
      replication_key: replicationKeyExportee,
      generated_at: new Date().toISOString(),
    },
  }
}
