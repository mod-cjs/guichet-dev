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
import {
  buildSkillIndex,
  matchThemeToCategorieSkills,
  parseCompetences,
  type SkillRef,
  type SkillWithCategorie,
} from './skills-normalize'
import { matchSkillsHybrid, prepareSemanticMatcher } from './skills-embeddings'
import {
  clampLimit,
  type GraphHealth,
  type GraphLivreDispo,
  type GraphOpportunite,
  type GraphPort,
  type GraphRessourcePrepa,
  type GraphUserScope,
  type LivreSearchCriteria,
  type MarketCount,
  type MarketCriteria,
  type MarketOverview,
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
    const competences = parseCompetences(profil?.competences)

    const [certs, diplomes] = profil
      ? await Promise.all([
          prisma.certificatMoodle.findMany({ where: { profilId: profil.id }, select: { formation: true } }),
          prisma.diplome.findMany({ where: { profilId: profil.id }, select: { intitule: true } }),
        ])
      : [[], []]

    // Même appariement HYBRIDE que la projection (GUIC-677) : sans ça, le fallback
    // Prisma déclarerait « manquante » une compétence que le graphe, lui, relie.
    //
    // ⚠️ CHEMIN DE RÉPONSE : lecture de cache STRICTE. Ce code s'exécute pendant que
    // l'usager attend, et le fallback Prisma est la configuration de PRODUCTION (Neo4j
    // non provisionné). Sans ce plafond, la première question « qu'est-ce qui me manque ? »
    // après un déploiement vectorisait les 114 libellés du référentiel — ~32 secondes
    // d'attente mesurées. Le référentiel est préchauffé par le cron, comme le catalogue.
    const semantic = await prepareSemanticMatcher(
      skills as SkillRef[],
      [...competences, ...certs.map(c => c.formation), ...diplomes.map(d => d.intitule)],
      { maxNew: 0 },
    )

    const mastered = new Set<string>()
    for (const comp of competences) {
      for (const m of matchSkillsHybrid(comp, index, semantic)) mastered.add(m.id)
    }
    for (const c of certs) for (const m of matchSkillsHybrid(c.formation, index, semantic)) mastered.add(m.id)
    for (const d of diplomes) for (const m of matchSkillsHybrid(d.intitule, index, semantic)) mastered.add(m.id)

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

  /**
   * Parité avec les templates `MARCHE_*` (recherche globale).
   * ⚠️ Invariant CDP : agrégats sur les OFFRES uniquement — aucun décompte de personnes,
   * de candidatures ni de profils.
   */
  async apercuMarche(criteria: MarketCriteria): Promise<MarketOverview> {
    const where: Prisma.OpportuniteWhereInput = { ...publishedNotExpired() }
    if (inEnum(Region, criteria.region)) where.region = criteria.region
    if (inEnum(Domaine, criteria.domaine)) where.domaine = criteria.domaine
    const take = clampLimit(criteria.limit)

    const [parType, parDomaine, parRegion, skillGroups, orgGroups] = await Promise.all([
      prisma.opportunite.groupBy({ by: ['type'], where, _count: { _all: true }, orderBy: { _count: { type: 'desc' } }, take }),
      prisma.opportunite.groupBy({ by: ['domaine'], where, _count: { _all: true }, orderBy: { _count: { domaine: 'desc' } }, take }),
      prisma.opportunite.groupBy({ by: ['region'], where, _count: { _all: true }, orderBy: { _count: { region: 'desc' } }, take }),
      prisma.opportuniteSkill.groupBy({
        by: ['skillId'],
        where: { requise: true, opportunite: where },
        _count: { _all: true },
      }),
      prisma.opportunite.groupBy({
        by: ['organisationId'],
        where: { ...where, organisationId: { not: null } },
        _count: { _all: true },
      }),
    ])

    // Palmarès compétences : on résout les libellés APRÈS le tri (une seule requête).
    const topSkills = [...skillGroups].sort((a, b) => b._count._all - a._count._all).slice(0, take)
    const skillLabels = topSkills.length
      ? await prisma.skill.findMany({
          where: { id: { in: topSkills.map(s => s.skillId) } },
          select: { id: true, libelle: true },
        })
      : []
    const labelById = new Map(skillLabels.map(s => [s.id, s.libelle]))

    const topOrgs = [...orgGroups].sort((a, b) => b._count._all - a._count._all).slice(0, take)
    const orgNames = topOrgs.length
      ? await prisma.organisation.findMany({
          where: { id: { in: topOrgs.map(o => o.organisationId!) } },
          select: { id: true, nom: true },
        })
      : []
    const nomById = new Map(orgNames.map(o => [o.id, o.nom]))

    const toCounts = (rows: Array<{ _count: { _all: number } } & Record<string, unknown>>, key: string): MarketCount[] =>
      rows
        .filter(r => r[key] != null)
        .map(r => ({ cle: String(r[key]), n: r._count._all }))
        .sort((a, b) => b.n - a.n)

    return {
      total: parType.reduce((a, b) => a + b._count._all, 0),
      parType: toCounts(parType, 'type'),
      parDomaine: toCounts(parDomaine, 'domaine'),
      parRegion: toCounts(parRegion, 'region'),
      competences: topSkills.flatMap(s => {
        const libelle = labelById.get(s.skillId)
        return libelle ? [{ cle: libelle, n: s._count._all }] : []
      }),
      organisations: topOrgs.flatMap(o => {
        const nom = o.organisationId ? nomById.get(o.organisationId) : undefined
        return nom ? [{ cle: nom, n: o._count._all }] : []
      }),
    }
  }

  /**
   * Parité avec `LIVRES_DISPONIBLES` : exemplaires DISPONIBLES + emplacement, filtrés
   * par mots-clés (titre/auteur), thème et région du centre.
   */
  async livresDisponibles(criteria: LivreSearchCriteria): Promise<GraphLivreDispo[]> {
    const q = criteria.q?.trim()
    const theme = criteria.theme?.trim()
    const where: Prisma.ExemplaireWhereInput = { statut: 'disponible' }
    if (inEnum(Region, criteria.region)) where.centre = { region: criteria.region }
    const livreWhere: Prisma.LivreWhereInput = {}
    if (q) livreWhere.OR = [{ titre: { contains: q } }, { auteur: { contains: q } }]
    if (theme) livreWhere.theme = { contains: theme }
    if (Object.keys(livreWhere).length > 0) where.livre = livreWhere

    const rows = await prisma.exemplaire.findMany({
      where,
      select: {
        id: true, rayon: true, etagere: true, position: true,
        livre: { select: { id: true, titre: true, auteur: true, theme: true } },
        centre: { select: { id: true, nom: true, region: true } },
      },
      orderBy: { livre: { titre: 'asc' } },
      take: clampLimit(criteria.limit),
    })

    return rows.map(e => ({
      livreId: e.livre.id,
      titre: e.livre.titre,
      auteur: e.livre.auteur,
      theme: e.livre.theme,
      exemplaireId: e.id,
      centreId: e.centre.id,
      centreNom: e.centre.nom,
      region: e.centre.region ? String(e.centre.region) : null,
      rayon: e.rayon,
      etagere: e.etagere,
      position: e.position,
    }))
  }

  /**
   * Parité avec `RESSOURCES_POUR_COMPETENCES` : la relation PREPARE est projetée depuis
   * `Ressource.theme` ↔ `Skill.categorie` (spec 02 §4) — on rejoue ici EXACTEMENT la même
   * dérivation (`matchThemeToCategorieSkills`) pour que le fallback renvoie le même ensemble.
   */
  async ressourcesPourCompetences(slugs: string[], limit?: number): Promise<GraphRessourcePrepa[]> {
    const wanted = new Set(slugs.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()))
    if (wanted.size === 0) return []

    const skills = await prisma.skill.findMany({ select: { id: true, slug: true, libelle: true, categorie: true } })
    const cibles = new Map(skills.filter(s => wanted.has(s.slug)).map(s => [s.id, s.libelle]))
    if (cibles.size === 0) return []

    const ressources = await prisma.ressource.findMany({
      where: { estPublic: true },
      select: { id: true, titre: true, type: true, theme: true, niveau: true },
    })

    // Parité avec la projection PREPARE : repli sémantique quand le thème ne correspond
    // à aucune catégorie de compétence (GUIC-677).
    const semantic = await prepareSemanticMatcher(skills as SkillRef[], ressources.map(r => r.theme), { maxNew: 0 })

    const out: GraphRessourcePrepa[] = []
    for (const r of ressources) {
      const parCategorie = matchThemeToCategorieSkills(r.theme, skills as SkillWithCategorie[])
      const prepares = parCategorie.length > 0
        ? parCategorie
        : (semantic?.match(r.theme) ?? []).map(m => m.id)
      const competences = prepares.flatMap(id => (cibles.has(id) ? [cibles.get(id)!] : []))
      if (competences.length === 0) continue
      out.push({
        id: r.id,
        titre: r.titre,
        type: String(r.type),
        theme: r.theme,
        niveau: r.niveau ? String(r.niveau) : null,
        competences: [...new Set(competences)],
      })
    }
    return out
      .sort((a, b) => b.competences.length - a.competences.length)
      .slice(0, clampLimit(limit))
  }
}
