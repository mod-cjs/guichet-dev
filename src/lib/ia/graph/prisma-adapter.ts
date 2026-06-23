// PrismaGraphAdapter — fallback du GraphPort (GUIC-275/433, R1).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md
//
// Implémente le port via Prisma quand Neo4j n'est pas (encore) configuré.
// Recherche/matching SIMPLE : les traversées profondes (reco collaborative,
// parcours multi-entités) sont rendues en best-effort borné — le moteur complet,
// c'est Neo4j. Réutilise la normalisation FLOUE des compétences (R2).

import { prisma } from '@/lib/prisma'
import { Domaine, Region, TypeOpportunite } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'
import { allowedNiveaux } from './niveau'
import { buildSkillIndex, matchSkills, parseCompetences, type SkillRef } from './skills-normalize'
import {
  clampLimit,
  type GraphHealth,
  type GraphOpportunite,
  type GraphPort,
  type GraphUserScope,
  type MultiEntityPath,
  type OpportuniteSearchCriteria,
  type RecoAggregate,
  type SkillGapResult,
} from './port'

const inEnum = <T extends Record<string, string>>(e: T, v: unknown): v is T[keyof T] =>
  typeof v === 'string' && Object.values(e).includes(v)

const OPP_SELECT = {
  id: true, slug: true, titre: true, type: true, region: true,
  organisation: true, organisationLibelle: true, deadline: true,
} satisfies Prisma.OpportuniteSelect

type OppRow = {
  id: string; slug: string; titre: string; type: unknown; region: unknown
  organisation: string | null; organisationLibelle: string | null; deadline: Date | null
}

function toOpp(r: OppRow): GraphOpportunite {
  return {
    id: r.id,
    slug: r.slug,
    titre: r.titre,
    type: String(r.type),
    organisation: r.organisationLibelle ?? r.organisation ?? null,
    region: r.region ? String(r.region) : null,
    deadline: r.deadline ? r.deadline.toISOString() : null,
  }
}

/** Filtre « publiée + non expirée ». */
function publishedNotExpired(): Prisma.OpportuniteWhereInput {
  return { statut: 'publiee', deletedAt: null, OR: [{ deadline: null }, { deadline: { gte: new Date() } }] }
}

export class PrismaGraphAdapter implements GraphPort {
  readonly backend = 'prisma' as const

  async healthcheck(): Promise<GraphHealth> {
    try {
      await prisma.opportunite.findFirst({ select: { id: true } })
      return { ok: true, backend: this.backend, detail: 'fallback Prisma (Neo4j non configuré)' }
    } catch (err) {
      logger.warn('[graph:prisma] healthcheck échec', { err: String(err) })
      return { ok: false, backend: this.backend, detail: String(err) }
    }
  }

  async searchOpportunites(criteria: OpportuniteSearchCriteria): Promise<GraphOpportunite[]> {
    const where: Prisma.OpportuniteWhereInput = publishedNotExpired()
    if (inEnum(Domaine, criteria.domaine)) where.domaine = criteria.domaine
    if (inEnum(Region, criteria.region)) where.region = criteria.region
    if (inEnum(TypeOpportunite, criteria.type)) where.type = criteria.type
    if (typeof criteria.q === 'string' && criteria.q.trim()) where.titre = { contains: criteria.q.trim() }

    const rows = await prisma.opportunite.findMany({
      where, select: OPP_SELECT,
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
      take: clampLimit(criteria.limit),
    })
    return rows.map(toOpp)
  }

  /**
   * Compétences maîtrisées (ids) par matching flou. Parité avec le graphe (spec 02 §4) :
   * compétences auto-déclarées (profil) ∪ compétences attestées par les certificats/diplômes.
   */
  private async masteredSkillIds(cjsUid: string): Promise<{ mastered: Set<string>; allSkills: SkillRef[] }> {
    const [profil, skills] = await Promise.all([
      prisma.profilJeune.findUnique({ where: { cjsUid }, select: { id: true, competences: true } }),
      prisma.skill.findMany({ select: { id: true, slug: true, libelle: true } }),
    ])
    const index = buildSkillIndex(skills as SkillRef[])
    const mastered = new Set<string>()
    for (const comp of parseCompetences(profil?.competences)) {
      for (const m of matchSkills(comp, index)) mastered.add(m.id)
    }
    if (profil) {
      const [certs, diplomes] = await Promise.all([
        prisma.certificatMoodle.findMany({ where: { profilId: profil.id }, select: { formation: true } }),
        prisma.diplome.findMany({ where: { profilId: profil.id }, select: { intitule: true } }),
      ])
      for (const c of certs) for (const m of matchSkills(c.formation, index)) mastered.add(m.id)
      for (const d of diplomes) for (const m of matchSkills(d.intitule, index)) mastered.add(m.id)
    }
    return { mastered, allSkills: skills as SkillRef[] }
  }

  async skillGap(scope: GraphUserScope, opportuniteId: string): Promise<SkillGapResult> {
    const [required, { mastered }] = await Promise.all([
      prisma.opportuniteSkill.findMany({
        where: { opportuniteId, requise: true },
        select: { skill: { select: { id: true, slug: true, libelle: true } } },
      }),
      this.masteredSkillIds(scope.cjsUid),
    ])
    const missing = required.map(r => r.skill).filter(s => !mastered.has(s.id))
    if (missing.length === 0) return { manquantes: [], formations: [] }

    const missingIds = missing.map(s => s.id)
    // Formations publiées développant (requise=false) une compétence manquante.
    const dev = await prisma.opportuniteSkill.findMany({
      where: {
        requise: false,
        skillId: { in: missingIds },
        opportunite: { ...publishedNotExpired(), formation: { isNot: null } },
      },
      select: { opportunite: { select: OPP_SELECT } },
      take: clampLimit() * 3,
    })
    const seen = new Set<string>()
    const formations: GraphOpportunite[] = []
    for (const d of dev) {
      if (seen.has(d.opportunite.id)) continue
      seen.add(d.opportunite.id)
      formations.push(toOpp(d.opportunite))
      if (formations.length >= clampLimit()) break
    }
    return { manquantes: missing.map(s => ({ slug: s.slug, libelle: s.libelle })), formations }
  }

  async eligibleOpportunites(scope: GraphUserScope, limit?: number): Promise<GraphOpportunite[]> {
    const [profil, applied] = await Promise.all([
      prisma.profilJeune.findUnique({ where: { cjsUid: scope.cjsUid }, select: { niveauEtude: true } }),
      prisma.candidature.findMany({ where: { cjsUid: scope.cjsUid }, select: { opportuniteId: true } }),
    ])
    const allowed = allowedNiveaux(profil?.niveauEtude)
    const where: Prisma.OpportuniteWhereInput = {
      ...publishedNotExpired(),
      id: { notIn: applied.map(a => a.opportuniteId) },
      ...(allowed.length ? { OR: [{ niveauEtudeMin: null }, { niveauEtudeMin: { in: allowed } }] } : {}),
    }
    const rows = await prisma.opportunite.findMany({
      where, select: OPP_SELECT, orderBy: [{ deadline: 'asc' }], take: clampLimit(limit),
    })
    return rows.map(toOpp)
  }

  async collaborativeReco(scope: GraphUserScope, limit?: number): Promise<RecoAggregate[]> {
    const mine = await prisma.candidature.findMany({
      where: { cjsUid: scope.cjsUid }, select: { opportuniteId: true },
    })
    const myOppIds = mine.map(c => c.opportuniteId)
    if (myOppIds.length === 0) return []

    // Co-postulants (autres bénéficiaires ayant postulé aux mêmes offres).
    const peers = await prisma.candidature.findMany({
      where: { opportuniteId: { in: myOppIds }, cjsUid: { not: scope.cjsUid } },
      select: { cjsUid: true },
      distinct: ['cjsUid'],
    })
    const peerUids = peers.map(p => p.cjsUid)
    if (peerUids.length === 0) return []

    // Leurs autres candidatures → agrégation (count distinct pairs), jamais d'attribut peer.
    const peerApps = await prisma.candidature.findMany({
      where: { cjsUid: { in: peerUids }, opportuniteId: { notIn: myOppIds } },
      select: { cjsUid: true, opportuniteId: true },
    })
    const popularity = new Map<string, Set<string>>()
    for (const a of peerApps) {
      if (!popularity.has(a.opportuniteId)) popularity.set(a.opportuniteId, new Set())
      popularity.get(a.opportuniteId)!.add(a.cjsUid)
    }
    if (popularity.size === 0) return []

    const recoOpps = await prisma.opportunite.findMany({
      where: { id: { in: [...popularity.keys()] }, ...publishedNotExpired() },
      select: { id: true, slug: true, titre: true },
    })
    return recoOpps
      .map(o => ({ id: o.id, slug: o.slug, titre: o.titre, popularite: popularity.get(o.id)?.size ?? 0 }))
      .sort((a, b) => b.popularite - a.popularite)
      .slice(0, clampLimit(limit))
  }

  async multiEntityPath(criteria: { domaine?: string; region?: string; limit?: number }): Promise<MultiEntityPath[]> {
    // Best-effort borné : le parcours profond (REQUIERT ∩ DEVELOPPE) est natif au graphe.
    const where: Prisma.OpportuniteWhereInput = {
      ...publishedNotExpired(),
      skills: { some: { requise: true } },
    }
    if (inEnum(Domaine, criteria.domaine)) where.domaine = criteria.domaine
    if (inEnum(Region, criteria.region)) where.region = criteria.region

    const limit = clampLimit(criteria.limit)
    const opps = await prisma.opportunite.findMany({
      where,
      select: {
        id: true, slug: true, titre: true,
        programme: { select: { nom: true } },
        skills: { where: { requise: true }, select: { skillId: true, skill: { select: { libelle: true } } }, take: 1 },
      },
      take: limit,
    })

    const out: MultiEntityPath[] = []
    for (const o of opps) {
      const req = o.skills[0]
      let formationTitre: string | null = null
      if (req) {
        const f = await prisma.opportunite.findFirst({
          where: { ...publishedNotExpired(), formation: { isNot: null }, skills: { some: { skillId: req.skillId, requise: false } } },
          select: { titre: true },
        })
        formationTitre = f?.titre ?? null
      }
      out.push({
        id: o.id, slug: o.slug, titre: o.titre,
        competence: req?.skill.libelle ?? null,
        formationTitre,
        programmeNom: o.programme?.nom ?? null,
      })
    }
    logger.debug('[graph:prisma] multiEntityPath best-effort', { count: out.length })
    return out
  }
}
