import { prisma } from '@/lib/prisma'
import type { Prisma, StatutCandidature } from '@prisma/client'
import { matchCompetences, type CompetencesMatchResult } from '@/lib/recruteur/competences-match'

/**
 * GUIC-512 — Loaders de l'Espace Recruteur/Partenaire.
 * Tout est tiré de la base : l'organisation du recruteur (via `cjsUid`), ses
 * opportunités (recruteurUid OU organisationId) et les candidatures reçues.
 */

export interface RecruteurContext {
  cjsUid: string
  prenom: string
  organisationId: string | null
  organisationNom: string | null
  estVerifie: boolean
  logoUrl: string | null
}

/** Contexte recruteur (org + identité) pour le chrome (sidebar/topbar). */
export async function getRecruteurContext(cjsUid: string): Promise<RecruteurContext> {
  const [user, org] = await Promise.all([
    prisma.utilisateur.findUnique({ where: { cjsUid }, select: { prenom: true } }),
    prisma.organisation.findFirst({ where: { cjsUid }, select: { id: true, nom: true, estVerifie: true, logoUrl: true } }),
  ])
  return {
    cjsUid,
    prenom: user?.prenom ?? '',
    organisationId: org?.id ?? null,
    organisationNom: org?.nom ?? null,
    estVerifie: org?.estVerifie ?? false,
    logoUrl: org?.logoUrl ?? null,
  }
}

/** Filtre « opportunités de ce recruteur » (par recruteurUid OU son organisation). */
function offreWhere(cjsUid: string, organisationId: string | null): Prisma.OpportuniteWhereInput {
  const or: Prisma.OpportuniteWhereInput[] = [{ recruteurUid: cjsUid }]
  if (organisationId) or.push({ organisationId })
  return { deletedAt: null, OR: or }
}

export interface RecruteurOffreItem {
  id: string
  titre: string
  statut: string
  candidatures: number
  vues: number
  // GUIC-515 — enrichissement design v4 (optionnels : renseignés par getRecruteurOffres).
  type?: string | null
  region?: string | null
  deadline?: string | null
  nouveau?: number
}

export interface RecruteurCandidatItem {
  id: string
  prenom: string
  nom: string
  statut: string
  offreTitre: string
  score: number | null
}

export interface RecruteurDashboard {
  offresActives: number
  candidaturesRecues: number
  candidaturesCetteSemaine: number
  aExaminer: number
  vuesTotales: number
  offres: RecruteurOffreItem[]
  aExaminerListe: RecruteurCandidatItem[]
}

export async function getRecruteurDashboard(cjsUid: string, organisationId: string | null): Promise<RecruteurDashboard> {
  const where = offreWhere(cjsUid, organisationId)
  const candWhere: Prisma.CandidatureWhereInput = { opportunite: where }
  // Variation hebdomadaire : candidatures reçues sur les 7 derniers jours.
  const depuis = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [offresActives, candidaturesRecues, candidaturesCetteSemaine, aExaminer, vues, offres, aExaminerListe] = await Promise.all([
    prisma.opportunite.count({ where: { ...where, statut: 'publiee' } }),
    prisma.candidature.count({ where: candWhere }),
    prisma.candidature.count({ where: { ...candWhere, soumiseA: { gte: depuis } } }),
    prisma.candidature.count({ where: { ...candWhere, pipelineStage: 'Recue' } }),
    prisma.opportunite.aggregate({ where, _sum: { vues: true } }),
    prisma.opportunite.findMany({
      where,
      select: { id: true, titre: true, statut: true, vues: true, _count: { select: { candidatures: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    prisma.candidature.findMany({
      where: { ...candWhere, pipelineStage: 'Recue' },
      select: { id: true, statut: true, scoreAdequation: true, utilisateur: { select: { prenom: true, nom: true } }, opportunite: { select: { titre: true } } },
      orderBy: { soumiseA: 'desc' },
      take: 8,
    }),
  ])

  return {
    offresActives,
    candidaturesRecues,
    candidaturesCetteSemaine,
    aExaminer,
    vuesTotales: vues._sum.vues ?? 0,
    offres: offres.map((o) => ({ id: o.id, titre: o.titre, statut: o.statut, candidatures: o._count.candidatures, vues: o.vues })),
    aExaminerListe: aExaminerListe.map((c) => ({ id: c.id, prenom: c.utilisateur.prenom, nom: c.utilisateur.nom, statut: c.statut, offreTitre: c.opportunite.titre, score: c.scoreAdequation })),
  }
}

/** Liste complète des offres du recruteur (page Mes offres). */
export async function getRecruteurOffres(cjsUid: string, organisationId: string | null): Promise<RecruteurOffreItem[]> {
  const rows = await prisma.opportunite.findMany({
    where: offreWhere(cjsUid, organisationId),
    select: {
      id: true, titre: true, statut: true, vues: true, type: true, region: true, deadline: true,
      _count: { select: { candidatures: true } },
      candidatures: { where: { pipelineStage: 'Recue' }, select: { id: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })
  return rows.map((o) => ({
    id: o.id, titre: o.titre, statut: o.statut, candidatures: o._count.candidatures, vues: o.vues,
    type: o.type, region: o.region, deadline: o.deadline ? o.deadline.toISOString() : null, nouveau: o.candidatures.length,
  }))
}

/** Liste des candidatures reçues (page Candidatures), filtrable par statut et recherche nom. */
export async function getRecruteurCandidatures(
  cjsUid: string,
  organisationId: string | null,
  statut?: StatutCandidature,
  q?: string,
): Promise<RecruteurCandidatItem[]> {
  const terme = q?.trim()
  const rows = await prisma.candidature.findMany({
    where: {
      opportunite: offreWhere(cjsUid, organisationId),
      ...(statut ? { statut } : {}),
      ...(terme
        ? { utilisateur: { OR: [{ prenom: { contains: terme } }, { nom: { contains: terme } }] } }
        : {}),
    },
    select: { id: true, statut: true, scoreAdequation: true, utilisateur: { select: { prenom: true, nom: true } }, opportunite: { select: { titre: true } } },
    orderBy: [{ scoreAdequation: { sort: 'desc', nulls: 'last' } }, { soumiseA: 'desc' }],
    take: 100,
  })
  return rows.map((c) => ({ id: c.id, prenom: c.utilisateur.prenom, nom: c.utilisateur.nom, statut: c.statut, offreTitre: c.opportunite.titre, score: c.scoreAdequation }))
}

export interface RecruteurCandidatureDetail {
  id: string
  statut: StatutCandidature
  lettreMotivation: string | null
  hasCv: boolean
  soumiseA: string
  updatedAt: string
  candidat: {
    cjsUid: string
    prenom: string
    nom: string
    email: string | null
    telephone: string | null
    photoUrl: string | null
    age: number | null
    commune: string | null
    region: string | null
    niveauEtude: string | null
    situationEmploi: string | null
    biographie: string | null
    domainesInteret: string[]
    competences: string[]
  }
  offre: { id: string; titre: string }
  score: number | null
  scoreRaison: string | null
  /** Rapprochement compétences candidat ↔ compétences requises de l'offre (GUIC-517). */
  competencesMatch: CompetencesMatchResult
}

/**
 * Détail d'une candidature d'une offre du recruteur (ownership via `offreWhere`).
 * Retourne `null` si introuvable OU non possédée (→ 404 côté page, pas de fuite).
 */
export async function getRecruteurCandidatureDetail(
  cjsUid: string,
  organisationId: string | null,
  id: string,
): Promise<RecruteurCandidatureDetail | null> {
  const row = await prisma.candidature.findFirst({
    where: { id, opportunite: offreWhere(cjsUid, organisationId) },
    select: {
      id: true, statut: true, lettreMotivation: true, cvUrl: true, soumiseA: true, updatedAt: true,
      scoreAdequation: true, scoreRaison: true,
      utilisateur: {
        select: {
          cjsUid: true, prenom: true, nom: true, email: true, telephone: true,
          dateNaissance: true, commune: true, region: true,
          profil: {
            select: {
              photoUrl: true, niveauEtude: true, situationEmploi: true, biographie: true,
              competences: true, domainesInteret: true,
            },
          },
        },
      },
      opportunite: {
        select: {
          id: true, titre: true,
          skills: { where: { requise: true }, select: { skill: { select: { libelle: true } } } },
        },
      },
    },
  })
  if (!row) return null

  const competences = jsonStringArray(row.utilisateur.profil?.competences)
  const domainesInteret = jsonStringArray(row.utilisateur.profil?.domainesInteret)
  const offreSkills = row.opportunite.skills.map((s) => s.skill.libelle)

  return {
    id: row.id,
    statut: row.statut,
    lettreMotivation: row.lettreMotivation,
    hasCv: Boolean(row.cvUrl),
    soumiseA: row.soumiseA.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    candidat: {
      cjsUid: row.utilisateur.cjsUid, prenom: row.utilisateur.prenom, nom: row.utilisateur.nom,
      email: row.utilisateur.email, telephone: row.utilisateur.telephone,
      photoUrl: row.utilisateur.profil?.photoUrl ?? null,
      age: ageFrom(row.utilisateur.dateNaissance),
      commune: row.utilisateur.commune,
      region: row.utilisateur.region ?? null,
      niveauEtude: row.utilisateur.profil?.niveauEtude ?? null,
      situationEmploi: row.utilisateur.profil?.situationEmploi ?? null,
      biographie: row.utilisateur.profil?.biographie ?? null,
      domainesInteret,
      competences,
    },
    offre: { id: row.opportunite.id, titre: row.opportunite.titre },
    score: row.scoreAdequation,
    scoreRaison: row.scoreRaison,
    competencesMatch: matchCompetences(offreSkills, competences),
  }
}

/** Convertit un champ Json Prisma en tableau de chaînes non vides. */
function jsonStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []
}

/** Palette du badge de score d'adéquation selon le palier (fort / moyen / faible). */
export function scoreColors(score: number | null): { bg: string; fg: string; label: string } {
  // Paliers alignés sur le kanban (design v4) : ≥85 vert, ≥70 teal, sinon gris.
  if (score == null) return { bg: 'var(--gj-line)', fg: 'var(--gj-grey)', label: '—' }
  if (score >= 85) return { bg: 'var(--gj-green-soft, #e6f6ec)', fg: 'var(--gj-green-ink, #1a7a3d)', label: `${score}%` }
  if (score >= 70) return { bg: 'var(--gj-teal-soft, #d9f2ee)', fg: 'var(--gj-teal-deep, #0F766E)', label: `${score}%` }
  return { bg: 'var(--gj-bg, #f6f8fa)', fg: 'var(--gj-grey)', label: `${score}%` }
}

export interface RecruteurEntretienItem {
  id: string
  candidatureId: string
  dateHeure: string
  mode: string
  lieu: string | null
  statut: string
  candidatNom: string
  offreTitre: string
}

/** Entretiens planifiés par le recruteur (page Entretiens), triés par date. */
export async function getRecruteurEntretiens(cjsUid: string): Promise<RecruteurEntretienItem[]> {
  const rows = await prisma.entretien.findMany({
    where: { recruteurUid: cjsUid },
    orderBy: { dateHeure: 'asc' },
    take: 200,
    select: {
      id: true, candidatureId: true, dateHeure: true, mode: true, lieu: true, statut: true,
      candidature: { select: { utilisateur: { select: { prenom: true, nom: true } }, opportunite: { select: { titre: true } } } },
    },
  })
  return rows.map((e) => ({
    id: e.id,
    candidatureId: e.candidatureId,
    dateHeure: e.dateHeure.toISOString(),
    mode: e.mode,
    lieu: e.lieu,
    statut: e.statut,
    candidatNom: `${e.candidature.utilisateur.prenom} ${e.candidature.utilisateur.nom}`.trim(),
    offreTitre: e.candidature.opportunite.titre,
  }))
}

// ── GUIC-515 — Pipeline kanban recruteur (design v4) ─────────────────────────────
export type PipelineStageId = 'Recue' | 'Preselection' | 'Entretien' | 'Decision'

export interface PipelineCard {
  id: string
  prenom: string
  nom: string
  age: number | null
  commune: string | null
  niveau: string | null
  skills: string[]
  match: number | null
  favori: boolean
  soumiseA: string
  offreTitre: string
  stage: PipelineStageId
}

export interface RecruteurPipeline {
  offres: { id: string; titre: string; statut: string }[]
  offreActiveId: string | null
  colonnes: Record<PipelineStageId, PipelineCard[]>
}

function ageFrom(d: Date | null): number | null {
  if (!d) return null
  const a = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
  return a > 0 && a < 120 ? a : null
}

/** Pipeline kanban des candidatures (optionnellement scopé à une offre). */
export async function getRecruteurPipeline(
  cjsUid: string,
  organisationId: string | null,
  offreId?: string,
  q?: string,
): Promise<RecruteurPipeline> {
  const base = offreWhere(cjsUid, organisationId)
  const offres = await prisma.opportunite.findMany({
    where: base,
    select: { id: true, titre: true, statut: true },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })
  const offreActiveId = offreId && offres.some((o) => o.id === offreId) ? offreId : null
  const terme = q?.trim()

  const rows = await prisma.candidature.findMany({
    where: {
      opportunite: base,
      ...(offreActiveId ? { opportuniteId: offreActiveId } : {}),
      ...(terme ? { utilisateur: { OR: [{ prenom: { contains: terme } }, { nom: { contains: terme } }] } } : {}),
    },
    select: {
      id: true, pipelineStage: true, scoreAdequation: true, favoriRecruteur: true, soumiseA: true,
      utilisateur: { select: { prenom: true, nom: true, dateNaissance: true, commune: true, profil: { select: { niveauEtude: true, competences: true } } } },
      opportunite: { select: { titre: true } },
    },
    orderBy: [{ favoriRecruteur: 'desc' }, { scoreAdequation: { sort: 'desc', nulls: 'last' } }],
    take: 300,
  })

  const colonnes: Record<PipelineStageId, PipelineCard[]> = { Recue: [], Preselection: [], Entretien: [], Decision: [] }
  for (const r of rows) {
    const comp = Array.isArray(r.utilisateur.profil?.competences)
      ? (r.utilisateur.profil!.competences as unknown[]).map((x) => String(x)).filter(Boolean)
      : []
    colonnes[r.pipelineStage].push({
      id: r.id,
      prenom: r.utilisateur.prenom,
      nom: r.utilisateur.nom,
      age: ageFrom(r.utilisateur.dateNaissance),
      commune: r.utilisateur.commune,
      niveau: r.utilisateur.profil?.niveauEtude ?? null,
      skills: comp.slice(0, 3),
      match: r.scoreAdequation,
      favori: r.favoriRecruteur,
      soumiseA: r.soumiseA.toISOString(),
      offreTitre: r.opportunite.titre,
      stage: r.pipelineStage,
    })
  }

  return { offres: offres.map((o) => ({ id: o.id, titre: o.titre, statut: o.statut })), offreActiveId, colonnes }
}

/** GUIC-515 — compteurs pour les badges de navigation recruteur (candidats à examiner). */
export async function getRecruteurNavCounts(cjsUid: string, organisationId: string | null): Promise<{ aExaminer: number }> {
  const aExaminer = await prisma.candidature.count({
    where: { pipelineStage: 'Recue', opportunite: offreWhere(cjsUid, organisationId) },
  })
  return { aExaminer }
}
