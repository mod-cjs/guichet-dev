// Driver Neo4j — singleton lazy (GUIC-259, GUIC-275, Lot 1).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md
//
// Neo4j est une VUE DÉRIVÉE de Prisma/MariaDB (read-model reconstructible) :
// on ne fait que des lectures côté agent + des projections via le pipeline.
// Le driver n'est instancié qu'au premier appel (pattern miroir de src/lib/prisma.ts).
//
// Variables d'env : NEO4J_URI (bolt://… / neo4j+s://…), NEO4J_USER (def. "neo4j"),
// NEO4J_PASSWORD, NEO4J_DATABASE (optionnel, multi-db).

import neo4j, { type Driver } from 'neo4j-driver'

const globalForNeo4j = globalThis as unknown as { neo4jDriver: Driver | undefined }

/** Vrai si Neo4j est configuré. Sinon, le `GraphPort` bascule sur le fallback Prisma (R1). */
export function isNeo4jConfigured(): boolean {
  return Boolean(process.env.NEO4J_URI && process.env.NEO4J_PASSWORD)
}

/** Base de données cible (multi-db Enterprise) — `undefined` = base par défaut. */
export function neo4jDatabase(): string | undefined {
  return process.env.NEO4J_DATABASE || undefined
}

let _driver: Driver | undefined

function createDriver(): Driver {
  const uri = process.env.NEO4J_URI
  const user = process.env.NEO4J_USER ?? 'neo4j'
  const password = process.env.NEO4J_PASSWORD
  if (!uri || !password) throw new Error('NEO4J_URI / NEO4J_PASSWORD manquants')
  return neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 5000,
  })
}

/** Driver partagé (lazy). Lève si Neo4j n'est pas configuré — appeler `isNeo4jConfigured()` avant. */
export function getNeo4jDriver(): Driver {
  if (!_driver) {
    _driver = globalForNeo4j.neo4jDriver ?? createDriver()
    if (process.env.NODE_ENV !== 'production') globalForNeo4j.neo4jDriver = _driver
  }
  return _driver
}

/** Ferme le driver (arrêt propre / tests). */
export async function closeNeo4jDriver(): Promise<void> {
  if (_driver) {
    await _driver.close()
    _driver = undefined
    globalForNeo4j.neo4jDriver = undefined
  }
}
