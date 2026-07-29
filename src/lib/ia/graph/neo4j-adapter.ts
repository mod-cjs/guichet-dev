// Neo4jGraphAdapter — implémentation cible du GraphPort (GUIC-275/433, Lot 1).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md §5
//
// Traversées Cypher EN LECTURE sur le read-model, via des templates WHITELISTÉS
// et PARAMÉTRÉS (jamais de NL concaténé). Filtrage RBAC borné à $uid.

import neo4j, { type Session, type QueryResult } from 'neo4j-driver'
import { getNeo4jDriver, neo4jDatabase } from '@/lib/neo4j'
import { logger } from '@/lib/logger'
import { numEnv } from '../env'
import { allowedNiveaux } from './niveau'
import {
  COLLABORATIVE_RECO,
  ELIGIBLE_OPPORTUNITES,
  FORMATIONS_FOR_SKILLS,
  GRAPH_POPULATED,
  LIVRES_DISPONIBLES,
  MARCHE_COMPETENCES,
  MARCHE_ORGANISATIONS,
  MARCHE_PAR_PROGRAMME,
  ACTEURS_DU_PROGRAMME,
  MARCHE_PAR_DOMAINE,
  MARCHE_PAR_REGION,
  MARCHE_PAR_TYPE,
  MULTI_ENTITY_PATH,
  RESSOURCES_POUR_COMPETENCES,
  SEARCH_OPPORTUNITES,
  SKILL_GAP_MISSING,
} from './cypher-templates'
import {
  clampLimit,
  GraphEmptyError,
  type CompetenceRef,
  type GraphHealth,
  type GraphLivreDispo,
  type GraphOpportunite,
  type GraphPort,
  type GraphRessourcePrepa,
  type GraphUserScope,
  type LivreSearchCriteria,
  type MarketCriteria,
  type MarketOverview,
  type ProgrammeActeurs,
  type MultiEntityPath,
  type OpportuniteSearchCriteria,
  type RecoAggregate,
  type SkillGapResult,
} from './port'

/** Durée de validité de la sentinelle « graphe peuplé » (évite un COUNT par requête vide). */
const POPULATED_TTL_MS = numEnv('YAYE_GRAPH_POPULATED_TTL_MS', 60_000)

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

export interface Neo4jAdapterOptions {
  /** Horloge injectable (tests). */
  now?: () => number
}

export class Neo4jGraphAdapter implements GraphPort {
  readonly backend = 'neo4j' as const
  /** Échéance de validité de la sentinelle « graphe peuplé ». */
  private populatedUntil = 0
  private readonly now: () => number

  constructor(opts: Neo4jAdapterOptions = {}) {
    this.now = opts.now ?? (() => Date.now())
  }

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

  /**
   * Distingue « aucun résultat métier » de « read-model VIDE ».
   * Le cron nocturne reconstruit le graphe en `wipe:true` : pendant cette fenêtre, toute
   * traversée renverrait 0 ligne et Yaye répondrait « je n'ai rien trouvé » au lieu de
   * basculer sur Prisma. On ne paie le COUNT que sur un résultat vide, et au plus une
   * fois par `POPULATED_TTL_MS`.
   */
  private async guardEmpty<T>(rows: T[]): Promise<T[]> {
    if (rows.length > 0 || this.now() < this.populatedUntil) return rows
    const populated = await this.read(GRAPH_POPULATED, {}, res => Boolean(res.records[0]?.get('populated')))
    if (!populated) throw new GraphEmptyError('read-model vide (reprojection en cours ?)')
    this.populatedUntil = this.now() + POPULATED_TTL_MS
    return rows
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
    const rows = await this.read(
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
    return this.guardEmpty(rows)
  }

  async skillGap(scope: GraphUserScope, opportuniteId: string): Promise<SkillGapResult> {
    const manquantes = await this.read(SKILL_GAP_MISSING, { uid: scope.cjsUid, oppId: opportuniteId }, res => {
      const raw = (res.records[0]?.get('manquantes') ?? []) as Array<{ slug: string | null; libelle: string }>
      return raw.map(c => ({ slug: c.slug ?? null, libelle: c.libelle } as CompetenceRef))
    })
    // Un graphe vide renverrait « aucune compétence manquante » — pire qu'un « rien trouvé » :
    // Yaye affirmerait à tort que le jeune a tout ce qu'il faut. On qualifie donc le vide.
    if (manquantes.length === 0) {
      await this.guardEmpty(manquantes)
      return { manquantes, formations: [] }
    }
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
    const rows = await this.read(
      ELIGIBLE_OPPORTUNITES,
      { uid: scope.cjsUid, allowedNiveaux: allowedNiveaux(niveau), limit: neo4j.int(clampLimit(limit)) },
      res => res.records.map(toOpp),
    )
    return this.guardEmpty(rows)
  }

  async collaborativeReco(scope: GraphUserScope, limit?: number): Promise<RecoAggregate[]> {
    const rows = await this.read(COLLABORATIVE_RECO, { uid: scope.cjsUid, limit: neo4j.int(clampLimit(limit)) }, res =>
      res.records.map(r => ({
        id: String(r.get('id')),
        slug: String(r.get('slug')),
        titre: String(r.get('titre')),
        popularite: toInt(r.get('popularite')),
      })),
    )
    return this.guardEmpty(rows)
  }

  async multiEntityPath(criteria: { domaine?: string; region?: string; limit?: number }): Promise<MultiEntityPath[]> {
    const rows = await this.read(
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
    return this.guardEmpty(rows)
  }

  async livresDisponibles(criteria: LivreSearchCriteria): Promise<GraphLivreDispo[]> {
    const rows = await this.read(
      LIVRES_DISPONIBLES,
      {
        q: criteria.q?.trim() ? criteria.q.trim() : null,
        theme: criteria.theme?.trim() ? criteria.theme.trim() : null,
        region: str(criteria.region),
        limit: neo4j.int(clampLimit(criteria.limit)),
      },
      res =>
        res.records.map(r => ({
          livreId: String(r.get('livreId')),
          titre: String(r.get('titre')),
          auteur: String(r.get('auteur')),
          theme: String(r.get('theme')),
          exemplaireId: String(r.get('exemplaireId')),
          centreId: String(r.get('centreId')),
          centreNom: String(r.get('centreNom')),
          region: str(r.get('region')),
          rayon: String(r.get('rayon')),
          etagere: String(r.get('etagere')),
          position: String(r.get('position')),
        })),
    )
    return this.guardEmpty(rows)
  }

  /**
   * Recherche GLOBALE. Cinq agrégations parallèles sur les offres ouvertes ; le total
   * est dérivé du palmarès par type (mêmes filtres, donc même population).
   * ⚠️ Aucune de ces requêtes ne touche `:Beneficiaire` (invariant CDP).
   */
  async apercuMarche(criteria: MarketCriteria): Promise<MarketOverview> {
    const params = {
      region: str(criteria.region),
      domaine: str(criteria.domaine),
      limit: neo4j.int(clampLimit(criteria.limit)),
    }
    const counts = (cypher: string) =>
      this.read(cypher, params, res =>
        res.records
          .filter(r => r.get('cle') != null)
          .map(r => ({ cle: String(r.get('cle')), n: toInt(r.get('n')) })),
      )

    const [parType, parDomaine, parRegion, competences, organisations, programmes] =
      await Promise.all([
        counts(MARCHE_PAR_TYPE),
        counts(MARCHE_PAR_DOMAINE),
        counts(MARCHE_PAR_REGION),
        counts(MARCHE_COMPETENCES),
        counts(MARCHE_ORGANISATIONS),
        counts(MARCHE_PAR_PROGRAMME),
      ])

    const total = parType.reduce((a, b) => a + b.n, 0)
    if (total === 0) await this.guardEmpty([])
    return { total, parType, parDomaine, parRegion, competences, organisations, programmes }
  }

  /** GUIC-684 — acteurs d'un programme (centres de déploiement, partenaires associés). */
  async acteursDuProgramme(slug: string): Promise<ProgrammeActeurs> {
    const vide: ProgrammeActeurs = { programme: null, centres: [], organisations: [] }
    const propre = typeof slug === 'string' ? slug.trim() : ''
    if (!propre) return vide

    return this.read(ACTEURS_DU_PROGRAMME, { slug: propre }, res => {
      const rec = res.records[0]
      if (!rec) return vide
      const liste = (cle: string) =>
        (rec.get(cle) as Array<Record<string, unknown>> | null) ?? []
      return {
        programme: rec.get('programme') != null ? String(rec.get('programme')) : null,
        centres: liste('centres').map(c => ({
          nom: String(c.nom),
          region: c.region != null ? String(c.region) : null,
        })),
        organisations: liste('organisations').map(o => ({ nom: String(o.nom) })),
      }
    })
  }

  async ressourcesPourCompetences(slugs: string[], limit?: number): Promise<GraphRessourcePrepa[]> {
    const cleaned = slugs.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim())
    if (cleaned.length === 0) return []
    const rows = await this.read(
      RESSOURCES_POUR_COMPETENCES,
      { slugs: cleaned, limit: neo4j.int(clampLimit(limit)) },
      res =>
        res.records.map(r => ({
          id: String(r.get('id')),
          titre: String(r.get('titre')),
          type: String(r.get('type')),
          theme: String(r.get('theme')),
          niveau: str(r.get('niveau')),
          competences: ((r.get('competences') ?? []) as unknown[]).map(String),
        })),
    )
    return this.guardEmpty(rows)
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
