// M13 / Data Hub — stub RED (GUIC-700 lot 7) : signatures posées, comportement pas encore correct.
import type { FullTableDescriptor } from './full-table-descriptor'

export function encodeFullTableCursor(cle: [string, string]): string {
  return Buffer.from(JSON.stringify(cle), 'utf8').toString('base64url')
}

export function decodeFullTableCursor(raw: string): [string, string] {
  return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
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

export async function fullTableExport(
  descriptor: FullTableDescriptor,
  params: FullTableParams,
  delegate: FindManyDelegate
): Promise<FullTablePage> {
  return { data: [], meta: { next_cursor: null, has_more: false, generated_at: new Date().toISOString() } }
}
