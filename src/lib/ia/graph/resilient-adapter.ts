// Adapter graphe RÉSILIENT (circuit-breaker) — GUIC-275, durcissement R1.
// Enveloppe l'adapter PRIMAIRE (Neo4j) et bascule sur le FALLBACK (Prisma) dès qu'un
// appel échoue À CHAUD (Neo4j tombe en cours de run). Sans ce wrapper, getGraphPort
// mémoïsait Neo4j au boot et chaque traversée échouait ensuite sans jamais retomber
// sur Prisma. Le breaker évite de marteler un Neo4j mort : après un échec il reste
// OUVERT pendant un cooldown (tout passe par Prisma), puis re-tente Neo4j (half-open).

import { logger } from '@/lib/logger'
import type {
  GraphHealth,
  GraphOpportunite,
  GraphPort,
  GraphUserScope,
  MultiEntityPath,
  OpportuniteSearchCriteria,
  RecoAggregate,
  SkillGapResult,
} from './port'

const DEFAULT_COOLDOWN_MS = Number(process.env.YAYE_GRAPH_BREAKER_MS ?? 30_000)

export interface ResilientOptions {
  cooldownMs?: number
  /** Horloge injectable (tests). */
  now?: () => number
}

export class ResilientGraphAdapter implements GraphPort {
  readonly backend = 'neo4j' as const
  private openUntil = 0
  private readonly cooldownMs: number
  private readonly now: () => number

  constructor(
    private readonly primary: GraphPort,
    private readonly fallback: GraphPort,
    opts: ResilientOptions = {},
  ) {
    this.cooldownMs = opts.cooldownMs ?? DEFAULT_COOLDOWN_MS
    this.now = opts.now ?? (() => Date.now())
  }

  /** Vrai si le breaker est ouvert (Neo4j court-circuité, on sert Prisma). */
  get breakerOpen(): boolean {
    return this.now() < this.openUntil
  }

  private async run<T>(call: (p: GraphPort) => Promise<T>): Promise<T> {
    if (this.breakerOpen) return call(this.fallback)
    try {
      return await call(this.primary)
    } catch (err) {
      this.openUntil = this.now() + this.cooldownMs
      logger.warn('[graph] Neo4j en échec → bascule Prisma (breaker ouvert)', {
        err: String(err),
        cooldownMs: this.cooldownMs,
      })
      return call(this.fallback)
    }
  }

  healthcheck(): Promise<GraphHealth> {
    return this.run((p) => p.healthcheck())
  }
  searchOpportunites(c: OpportuniteSearchCriteria): Promise<GraphOpportunite[]> {
    return this.run((p) => p.searchOpportunites(c))
  }
  skillGap(scope: GraphUserScope, opportuniteId: string): Promise<SkillGapResult> {
    return this.run((p) => p.skillGap(scope, opportuniteId))
  }
  eligibleOpportunites(scope: GraphUserScope, limit?: number): Promise<GraphOpportunite[]> {
    return this.run((p) => p.eligibleOpportunites(scope, limit))
  }
  collaborativeReco(scope: GraphUserScope, limit?: number): Promise<RecoAggregate[]> {
    return this.run((p) => p.collaborativeReco(scope, limit))
  }
  multiEntityPath(criteria: { domaine?: string; region?: string; limit?: number }): Promise<MultiEntityPath[]> {
    return this.run((p) => p.multiEntityPath(criteria))
  }
}
