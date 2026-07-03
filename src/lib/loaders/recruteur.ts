import { prisma } from '@/lib/prisma'
import type { Prisma, StatutCandidature } from '@prisma/client'

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
    prisma.candidature.count({ where: { ...candWhere, statut: 'En_attente' } }),
    prisma.opportunite.aggregate({ where, _sum: { vues: true } }),
    prisma.opportunite.findMany({
      where,
      select: { id: true, titre: true, statut: true, vues: true, _count: { select: { candidatures: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    prisma.candidature.findMany({
      where: { ...candWhere, statut: 'En_attente' },
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
    select: { id: true, titre: true, statut: true, vues: true, _count: { select: { candidatures: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })
  return rows.map((o) => ({ id: o.id, titre: o.titre, statut: o.statut, candidatures: o._count.candidatures, vues: o.vues }))
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
  candidat: { cjsUid: string; prenom: string; nom: string; email: string | null; telephone: string | null }
  offre: { id: string; titre: string }
  score: number | null
  scoreRaison: string | null
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
      utilisateur: { select: { cjsUid: true, prenom: true, nom: true, email: true, telephone: true } },
      opportunite: { select: { id: true, titre: true } },
    },
  })
  if (!row) return null
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
    },
    offre: { id: row.opportunite.id, titre: row.opportunite.titre },
    score: row.scoreAdequation,
    scoreRaison: row.scoreRaison,
  }
}

/** Palette du badge de score d'adéquation selon le palier (fort / moyen / faible). */
export function scoreColors(score: number | null): { bg: string; fg: string; label: string } {
  if (score == null) return { bg: 'var(--gj-line)', fg: 'var(--gj-grey)', label: '—' }
  if (score >= 75) return { bg: 'var(--gj-green-soft, #e6f6ec)', fg: 'var(--gj-green-ink, #1a7a3d)', label: `${score}%` }
  if (score >= 50) return { bg: 'var(--gj-blue-soft, #E8EFFF)', fg: 'var(--gj-blue-ink, #1A3FA8)', label: `${score}%` }
  return { bg: 'var(--gj-line)', fg: 'var(--gj-grey)', label: `${score}%` }
}

export interface RecruteurEntretienItem {
  id: string
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
      id: true, dateHeure: true, mode: true, lieu: true, statut: true,
      candidature: { select: { utilisateur: { select: { prenom: true, nom: true } }, opportunite: { select: { titre: true } } } },
    },
  })
  return rows.map((e) => ({
    id: e.id,
    dateHeure: e.dateHeure.toISOString(),
    mode: e.mode,
    lieu: e.lieu,
    statut: e.statut,
    candidatNom: `${e.candidature.utilisateur.prenom} ${e.candidature.utilisateur.nom}`.trim(),
    offreTitre: e.candidature.opportunite.titre,
  }))
}
