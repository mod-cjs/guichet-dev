// Helpers d'écriture Cypher idempotente (GUIC-279, Lot 1).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md §6 (pipeline)
//
// ⚠️ SENS D'ÉCRITURE UNIQUE : Prisma → Neo4j. Ces helpers sont les SEULS à écrire
// dans le graphe (depuis le pipeline de projection). Aucun Route Handler n'écrit
// dans Neo4j (invariant read-model §0). Tout est MERGE → rejouable sans doublon.
//
// Port des helpers validés du POC (yaye-kg-poc/src/graph_loader.py : merge_nodes,
// merge_rels, ensure_constraints) vers le driver TypeScript.

import neo4j from 'neo4j-driver'
import { getNeo4jDriver, neo4jDatabase } from '@/lib/neo4j'

const BATCH = 1000

/** Échappe un identifiant (label / clé de propriété / type de relation) pour le back-tick Cypher. */
function ident(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`[graph] identifiant Cypher invalide: ${name}`)
  }
  return '`' + name + '`'
}

/** Une session d'écriture (WRITE) sur la base configurée. */
function writeSession() {
  return getNeo4jDriver().session({
    database: neo4jDatabase(),
    defaultAccessMode: neo4j.session.WRITE,
  })
}

/** Crée une contrainte d'unicité (clé naturelle) par label. À exécuter en premier. */
export async function ensureConstraints(labelKeys: Record<string, string>): Promise<void> {
  const session = writeSession()
  try {
    for (const [label, key] of Object.entries(labelKeys)) {
      await session.run(
        `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${ident(label)}) REQUIRE n.${ident(key)} IS UNIQUE`,
      )
    }
  } finally {
    await session.close()
  }
}

/** Crée des index simples (label, prop) pour accélérer les traversées de matching. */
export async function ensureIndexes(specs: ReadonlyArray<readonly [string, string]>): Promise<void> {
  const session = writeSession()
  try {
    for (const [label, prop] of specs) {
      await session.run(
        `CREATE INDEX IF NOT EXISTS FOR (n:${ident(label)}) ON (n.${ident(prop)})`,
      )
    }
  } finally {
    await session.close()
  }
}

export type NodeRecord = Record<string, unknown>

/**
 * MERGE d'un lot de nœuds sur `key`, `SET n += row` pour le reste des props.
 * `extraLabels` pose des labels additionnels (ex. sous-type d'opportunité) via `SET n:Label`.
 */
export async function mergeNodes(
  label: string,
  key: string,
  rows: NodeRecord[],
  extraLabels: string[] = [],
): Promise<number> {
  if (rows.length === 0) return 0
  const setLabels = extraLabels.map(l => ` SET n:${ident(l)}`).join('')
  const cypher =
    `UNWIND $rows AS row ` +
    `MERGE (n:${ident(label)} {${ident(key)}: row.${ident(key)}}) ` +
    `SET n += row${setLabels}`
  const session = writeSession()
  try {
    for (let i = 0; i < rows.length; i += BATCH) {
      await session.run(cypher, { rows: rows.slice(i, i + BATCH).map(clean) })
    }
    return rows.length
  } finally {
    await session.close()
  }
}

export interface RelPair {
  from: unknown
  to: unknown
  [edgeProp: string]: unknown
}

/**
 * MERGE d'un lot de relations `(from)-[rel]->(to)` avec props d'arête optionnelles.
 * `pairs` = [{ from, to, ...edgeProps }]. Les nœuds doivent déjà exister (MATCH).
 */
export async function mergeRels(
  rel: string,
  fromLabel: string,
  fromKey: string,
  toLabel: string,
  toKey: string,
  pairs: RelPair[],
): Promise<number> {
  if (pairs.length === 0) return 0
  const edgeKeys = Object.keys(pairs[0]).filter(k => k !== 'from' && k !== 'to')
  const setEdge = edgeKeys.length
    ? ' SET ' + edgeKeys.map(k => `r.${ident(k)} = row.${ident(k)}`).join(', ')
    : ''
  const cypher =
    `UNWIND $rows AS row ` +
    `MATCH (a:${ident(fromLabel)} {${ident(fromKey)}: row.from}) ` +
    `MATCH (b:${ident(toLabel)} {${ident(toKey)}: row.to}) ` +
    `MERGE (a)-[r:${ident(rel)}]->(b)${setEdge}`
  const session = writeSession()
  try {
    let written = 0
    for (let i = 0; i < pairs.length; i += BATCH) {
      const batch = pairs.slice(i, i + BATCH).map(clean) as RelPair[]
      await session.run(cypher, { rows: batch })
      written += batch.length
    }
    return written
  } finally {
    await session.close()
  }
}

/** Vide entièrement le graphe (reprojection complète nocturne — filet de sécurité). */
export async function wipeGraph(): Promise<void> {
  const session = writeSession()
  try {
    // CALL ... IN TRANSACTIONS pour ne pas saturer la heap sur gros volumes.
    await session.run('MATCH (n) CALL { WITH n DETACH DELETE n } IN TRANSACTIONS OF 1000 ROWS')
  } finally {
    await session.close()
  }
}

/** Normalise une ligne pour Neo4j : `undefined`/`NaN` → `null`, `Date` → ISO, `Decimal`/bigint → number. */
function clean<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || (typeof v === 'number' && Number.isNaN(v))) {
      out[k] = null
    } else if (v instanceof Date) {
      out[k] = v.toISOString()
    } else if (typeof v === 'bigint') {
      out[k] = Number(v)
    } else if (v !== null && typeof v === 'object' && 'toNumber' in v && typeof (v as { toNumber: unknown }).toNumber === 'function') {
      // Prisma.Decimal → number
      out[k] = (v as { toNumber: () => number }).toNumber()
    } else {
      out[k] = v
    }
  }
  return out as T
}
