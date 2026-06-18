// Port d'abstraction du Knowledge Graph (GUIC-259, GUIC-275, Lot 1, R1).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md
//
// Le service agent ne dépend JAMAIS en dur de Neo4j : il passe par ce port.
// Deux implémentations :
//   - Neo4jGraphAdapter  (cible)    → traversées Cypher sur le read-model.
//   - PrismaGraphAdapter (fallback) → recherche/matching simple via Prisma.
//
// La surface réactive riche (NL → Cypher whitelisté : écart de compétences,
// reco collaborative, parcours multi-entités) arrivera avec query_knowledge_graph
// (GUIC-433). Ce port démarre par le strict nécessaire pour valider l'abstraction
// + le health check, de façon honnêtement extensible.

export type GraphBackend = 'neo4j' | 'prisma'

export interface GraphHealth {
  ok: boolean
  backend: GraphBackend
  detail?: string
}

/** Critères de recherche d'opportunités (sous-ensemble — surface complète en GUIC-433). */
export interface OpportuniteSearchCriteria {
  /** Valeur d'enum `Domaine` (validée par l'adapter). */
  domaine?: string
  /** Valeur d'enum `Region`. */
  region?: string
  /** Valeur d'enum `TypeOpportunite`. */
  type?: string
  /** Mots-clés cherchés dans le titre. */
  q?: string
  /** Borne de résultats (défaut 5, max 20). */
  limit?: number
}

/** Projection minimale d'une opportunité — alignée sur `YayeOppItem` du Lot 0. */
export interface GraphOpportunite {
  id: string
  slug: string
  titre: string
  type: string
  organisation: string | null
  region: string | null
  /** ISO 8601 ou null. */
  deadline: string | null
}

/**
 * Port du graphe. Toute opération est en LECTURE (Neo4j = read-model).
 * Les écritures passent par le pipeline de projection Prisma→Neo4j (GUIC-279).
 */
export interface GraphPort {
  readonly backend: GraphBackend
  /** Vérifie la connectivité du backend. Ne lève jamais. */
  healthcheck(): Promise<GraphHealth>
  /** Recherche simple d'opportunités publiées et non expirées. */
  searchOpportunites(criteria: OpportuniteSearchCriteria): Promise<GraphOpportunite[]>
}

export const DEFAULT_LIMIT = 5
export const MAX_LIMIT = 20

/** Borne la limite demandée dans [1, MAX_LIMIT]. */
export function clampLimit(limit?: number): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)))
}
