// PrismaGraphAdapter — fallback du GraphPort (GUIC-275, R1).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md
//
// Implémente le port via Prisma quand Neo4j n'est pas (encore) configuré.
// Recherche/matching SIMPLE uniquement : pas de traversée multi-entités — c'est
// le rôle de Neo4j. Permet de démarrer le code sans bloquer sur l'infra.

import { prisma } from '@/lib/prisma'
import { Domaine, Region, TypeOpportunite } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'
import {
  clampLimit,
  type GraphHealth,
  type GraphOpportunite,
  type GraphPort,
  type OpportuniteSearchCriteria,
} from './port'

const inEnum = <T extends Record<string, string>>(e: T, v: unknown): v is T[keyof T] =>
  typeof v === 'string' && Object.values(e).includes(v)

export class PrismaGraphAdapter implements GraphPort {
  readonly backend = 'prisma' as const

  async healthcheck(): Promise<GraphHealth> {
    try {
      // Lecture triviale (pas de SQL brut) pour vérifier la connectivité MariaDB.
      await prisma.opportunite.findFirst({ select: { id: true } })
      return { ok: true, backend: this.backend, detail: 'fallback Prisma (Neo4j non configuré)' }
    } catch (err) {
      logger.warn('[graph:prisma] healthcheck échec', { err: String(err) })
      return { ok: false, backend: this.backend, detail: String(err) }
    }
  }

  async searchOpportunites(criteria: OpportuniteSearchCriteria): Promise<GraphOpportunite[]> {
    const where: Prisma.OpportuniteWhereInput = {
      statut: 'publiee',
      deletedAt: null,
      OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
    }
    if (inEnum(Domaine, criteria.domaine)) where.domaine = criteria.domaine
    if (inEnum(Region, criteria.region)) where.region = criteria.region
    if (inEnum(TypeOpportunite, criteria.type)) where.type = criteria.type
    if (typeof criteria.q === 'string' && criteria.q.trim()) {
      where.titre = { contains: criteria.q.trim() }
    }

    const rows = await prisma.opportunite.findMany({
      where,
      select: {
        id: true, slug: true, titre: true, type: true, region: true,
        organisation: true, organisationLibelle: true, deadline: true,
      },
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
      take: clampLimit(criteria.limit),
    })

    return rows.map(r => ({
      id: r.id,
      slug: r.slug,
      titre: r.titre,
      type: String(r.type),
      organisation: r.organisationLibelle ?? r.organisation ?? null,
      region: r.region ? String(r.region) : null,
      deadline: r.deadline ? r.deadline.toISOString() : null,
    }))
  }
}
