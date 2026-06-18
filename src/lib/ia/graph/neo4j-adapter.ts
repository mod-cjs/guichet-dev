// Neo4jGraphAdapter — implémentation cible du GraphPort (GUIC-275, Lot 1).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md
//
// Traversées Cypher EN LECTURE sur le read-model. Les templates riches (écart de
// compétences, reco collaborative, parcours multi-entités) viendront avec
// query_knowledge_graph (GUIC-433) ; ici on pose le 1er template whitelisté +
// le health check pour valider la connexion.

import neo4j from 'neo4j-driver'
import { getNeo4jDriver, neo4jDatabase } from '@/lib/neo4j'
import { logger } from '@/lib/logger'
import {
  clampLimit,
  type GraphHealth,
  type GraphOpportunite,
  type GraphPort,
  type OpportuniteSearchCriteria,
} from './port'

// Template Cypher whitelisté (paramétré — jamais de concaténation de NL).
const SEARCH_OPPORTUNITES = `
  MATCH (o:Opportunite)
  WHERE o.statut = 'publiee'
    AND ($domaine IS NULL OR o.domaine = $domaine)
    AND ($region  IS NULL OR o.region  = $region)
    AND ($type    IS NULL OR o.type    = $type)
    AND ($q       IS NULL OR toLower(o.titre) CONTAINS toLower($q))
    AND (o.deadline IS NULL OR o.deadline >= datetime())
  RETURN o.id   AS id,
         o.slug AS slug,
         o.titre AS titre,
         o.type AS type,
         coalesce(o.organisationLibelle, o.organisation) AS organisation,
         o.region AS region,
         CASE WHEN o.deadline IS NULL THEN null ELSE toString(o.deadline) END AS deadline
  ORDER BY o.deadline ASC
  LIMIT $limit
`

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

export class Neo4jGraphAdapter implements GraphPort {
  readonly backend = 'neo4j' as const

  async healthcheck(): Promise<GraphHealth> {
    const session = getNeo4jDriver().session({
      database: neo4jDatabase(),
      defaultAccessMode: neo4j.session.READ,
    })
    try {
      await session.run('RETURN 1 AS ok')
      return { ok: true, backend: this.backend }
    } catch (err) {
      logger.warn('[graph:neo4j] healthcheck échec', { err: String(err) })
      return { ok: false, backend: this.backend, detail: String(err) }
    } finally {
      await session.close()
    }
  }

  async searchOpportunites(criteria: OpportuniteSearchCriteria): Promise<GraphOpportunite[]> {
    const session = getNeo4jDriver().session({
      database: neo4jDatabase(),
      defaultAccessMode: neo4j.session.READ,
    })
    try {
      const res = await session.run(SEARCH_OPPORTUNITES, {
        domaine: str(criteria.domaine),
        region: str(criteria.region),
        type: str(criteria.type),
        q: criteria.q?.trim() ? criteria.q.trim() : null,
        limit: neo4j.int(clampLimit(criteria.limit)),
      })
      return res.records.map(rec => ({
        id: String(rec.get('id')),
        slug: String(rec.get('slug')),
        titre: String(rec.get('titre')),
        type: String(rec.get('type')),
        organisation: str(rec.get('organisation')),
        region: str(rec.get('region')),
        deadline: str(rec.get('deadline')),
      }))
    } finally {
      await session.close()
    }
  }
}
