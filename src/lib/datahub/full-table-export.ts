/**
 * M13 / Data Hub — extraction FULL_TABLE (lot 7, spec §5, arbitrage v_programs_summary).
 *
 * Parallèle à `keyset.ts`, pas une extension : pas de `since`, jamais. Un flux FULL_TABLE
 * se réextrait intégralement à chaque run — c'est la réponse Singer habituelle pour les
 * tables de référence, bon marché ici (tables de jonction, petites). Le curseur pagine
 * sur la clé COMPOSITE entière (tri total, comme `(watermark, pk)` pour l'incrémental,
 * mais sans watermark).
 */
import { BadCursorError } from './cursor'
import { projectFullTableRow, type FullTableDescriptor } from './full-table-descriptor'

export const LIMIT_DEFAUT = 1000
export const LIMIT_MAX = 5000

export function encodeFullTableCursor(cle: [string, string]): string {
  return Buffer.from(JSON.stringify(cle), 'utf8').toString('base64url')
}

export function decodeFullTableCursor(raw: string): [string, string] {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new BadCursorError('valeur absente')
  }
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) {
    throw new BadCursorError('encodage attendu base64url')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
  } catch {
    throw new BadCursorError('contenu illisible')
  }

  if (!Array.isArray(parsed) || parsed.length !== 2 || parsed.some((v) => typeof v !== 'string')) {
    throw new BadCursorError('paire de clés attendue')
  }
  return parsed as [string, string]
}

export interface FullTableParams {
  cursor?: string | null
  limit?: number | null
}

export interface FullTablePage {
  data: Record<string, unknown>[]
  meta: {
    next_cursor: string | null
    has_more: boolean
    generated_at: string
  }
}

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

export async function fullTableExport(
  descriptor: FullTableDescriptor,
  params: FullTableParams,
  delegate: FindManyDelegate
): Promise<FullTablePage> {
  const limit = borneLimit(params.limit)
  const [pk1, pk2] = descriptor.primaryKey

  let where: Record<string, unknown> = {}
  if (params.cursor) {
    // Décodé AVANT toute requête : un curseur malformé ne doit jamais dégénérer en scan
    // de table entière.
    const [c1, c2] = decodeFullTableCursor(params.cursor)
    where = { OR: [{ [pk1]: { gt: c1 } }, { [pk1]: c1, [pk2]: { gt: c2 } }] }
  }
  // AUCUN filtre `since` : un flux FULL_TABLE n'a pas de watermark, par construction.

  const rows = await delegate.findMany({
    where,
    select: descriptor.select,
    orderBy: descriptor.orderBy,
    take: limit + 1,
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const derniere = page.at(-1)

  return {
    data: page.map((row) => projectFullTableRow(descriptor, row)),
    meta: {
      next_cursor:
        hasMore && derniere
          ? encodeFullTableCursor([String(derniere[pk1]), String(derniere[pk2])])
          : null,
      has_more: hasMore,
      generated_at: new Date().toISOString(),
    },
  }
}
