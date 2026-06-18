// Sélecteur de GraphPort (GUIC-275, R1).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md
//
// Choisit l'adapter selon la configuration : Neo4j si présent, sinon fallback
// Prisma. Le reste de l'agent importe UNIQUEMENT `getGraphPort()` — jamais un
// adapter en dur (invariant R1 : aucune dépendance directe à Neo4j).

import { isNeo4jConfigured } from '@/lib/neo4j'
import { logger } from '@/lib/logger'
import { Neo4jGraphAdapter } from './neo4j-adapter'
import { PrismaGraphAdapter } from './prisma-adapter'
import type { GraphPort } from './port'

let _port: GraphPort | undefined

/** Port du graphe (singleton). Neo4j si configuré, sinon fallback Prisma. */
export function getGraphPort(): GraphPort {
  if (_port) return _port
  if (isNeo4jConfigured()) {
    _port = new Neo4jGraphAdapter()
    logger.info('[graph] adapter actif', { backend: 'neo4j' })
  } else {
    _port = new PrismaGraphAdapter()
    logger.info('[graph] Neo4j non configuré → fallback Prisma', { backend: 'prisma' })
  }
  return _port
}

/** Réinitialise le port mémoïsé (tests uniquement). */
export function resetGraphPort(): void {
  _port = undefined
}

export * from './port'
