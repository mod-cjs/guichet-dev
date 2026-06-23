// Neo4jGraphAdapter — implémentation cible du GraphPort (GUIC-275/433, Lot 1).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md §5
//
// Traversées Cypher EN LECTURE sur le read-model, via des templates WHITELISTÉS
// et PARAMÉTRÉS (jamais de NL concaténé). Filtrage RBAC borné à $uid.

import neo4j, { type Session, type QueryResult } from 'neo4j-driver'
import { getNeo4jDriver, neo4jDatabase } from '@/lib/neo4j'
import { logger } from '@/lib/logger'
import { allowedNiveaux } from './niveau'
import {
  COLLABORATIVE_RECO,
  ELIGIBLE_OPPORTUNITES,
  FORMATIONS_FOR_SKILLS,
  MULTI_ENTITY_PATH,
  SEARCH_OPPORTUNITES,
  SKILL_GAP_MISSING,
} from './cypher-templates'
import {
  clampLimit,
  type CompetenceRef,
  type GraphHealth,
  type GraphOpportunite,
  type GraphPort,
  type GraphUserScope,
  type MultiEntityPath,
  type OpportuniteSearchCriteria,
  type RecoAggregate,
  type SkillGapResult,
} from './port'

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function toOpp(rec: { get(k: string): unknown }): GraphOpportunite {
  return {
    id: String(rec.get('id')),
    slug: String(rec.get('slug')),
    titre: String(rec.get('titre')),
    type: String(rec.get('type')),
    organisation: str(rec.get('organisation')),
    region: str(rec.get('region')),
    deadline: str(rec.get('deadline')),
  }
}

export class Neo4jGraphAdapter implements GraphPort {
  readonly backend = 'neo4j' as const

  private session(): Session {
    return getNeo4jDriver().session({
      database: neo4jDatabase(),
      defaultAccessMode: neo4j.session.READ,
    })
  }

  /** Exécute une lecture paramétrée et ferme toujours la session. */
  private async read<T>(cypher: string, params: Record<string, unknown>, map: (r: QueryResult) => T): Promise<T> {
    const session = this.session()
    try {
      return map(await session.run(cypher, params))
    } finally {
      await session.close()
    }
  }

  async healthcheck(): Promise<GraphHealth> {
    try {
      await this.read('RETURN 1 AS ok', {}, () => null)
      return { ok: true, backend: this.backend }
    } catch (err) {
      logger.warn('[graph:neo4j] healthcheck échec', { err: String(err) })
      return { ok: false, backend: this.backend, detail: String(err) }
    }
  }

  async searchOpportunites(criteria: OpportuniteSearchCriteria): Promise<GraphOpportunite[]> {
    return this.read(
      SEARCH_OPPORTUNITES,
      {
        domaine: str(criteria.domaine),
        region: str(criteria.region),
        type: str(criteria.type),
        q: criteria.q?.trim() ? criteria.q.trim() : null,
        limit: neo4j.int(clampLimit(criteria.limit)),
      },
      res => res.records.map(toOpp),
    )
  }

  async skillGap(scope: GraphUserScope, opportuniteId: string): Promise<SkillGapResult> {
    const manquantes = await this.read(SKILL_GAP_MISSING, { uid: scope.cjsUid, oppId: opportuniteId }, res => {
      const raw = (res.records[0]?.get('manquantes') ?? []) as Array<{ slug: string | null; libelle: string }>
      return raw.map(c => ({ slug: c.slug ?? null, libelle: c.libelle } as CompetenceRef))
    })
    if (manquantes.length === 0) return { manquantes, formations: [] }
    const slugs = manquantes.map(c => c.slug).filter((s): s is string => Boolean(s))
    const formations = slugs.length
      ? await this.read(FORMATIONS_FOR_SKILLS, { slugs, limit: neo4j.int(clampLimit()) }, res => res.records.map(toOpp))
      : []
    return { manquantes, formations }
  }

  async eligibleOpportunites(scope: GraphUserScope, limit?: number): Promise<GraphOpportunite[]> {
    const niveau = await this.read(
      'MATCH (b:Beneficiaire {cjsUid: $uid}) RETURN b.niveauEtude AS niveau',
      { uid: scope.cjsUid },
      res => str(res.records[0]?.get('niveau')),
    )
    return this.read(
      ELIGIBLE_OPPORTUNITES,
      { uid: scope.cjsUid, allowedNiveaux: allowedNiveaux(niveau), limit: neo4j.int(clampLimit(limit)) },
      res => res.records.map(toOpp),
    )
  }

  async collaborativeReco(scope: GraphUserScope, limit?: number): Promise<RecoAggregate[]> {
    return this.read(COLLABORATIVE_RECO, { uid: scope.cjsUid, limit: neo4j.int(clampLimit(limit)) }, res =>
      res.records.map(r => ({
        id: String(r.get('id')),
        slug: String(r.get('slug')),
        titre: String(r.get('titre')),
        popularite: toInt(r.get('popularite')),
      })),
    )
  }

  async multiEntityPath(criteria: { domaine?: string; region?: string; limit?: number }): Promise<MultiEntityPath[]> {
    return this.read(
      MULTI_ENTITY_PATH,
      { domaine: str(criteria.domaine), region: str(criteria.region), limit: neo4j.int(clampLimit(criteria.limit)) },
      res =>
        res.records.map(r => ({
          id: String(r.get('id')),
          slug: String(r.get('slug')),
          titre: String(r.get('titre')),
          competence: str(r.get('competence')),
          formationTitre: str(r.get('formationTitre')),
          programmeNom: str(r.get('programmeNom')),
        })),
    )
  }
}

/** Neo4j renvoie les entiers en `Integer` (ou number selon config) — normalise. */
function toInt(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'toNumber' in v && typeof (v as { toNumber: unknown }).toNumber === 'function') {
    return (v as { toNumber: () => number }).toNumber()
  }
  return Number(v) || 0
}
