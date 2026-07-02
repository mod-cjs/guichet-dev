import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

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
}

export interface RecruteurDashboard {
  offresActives: number
  candidaturesRecues: number
  aExaminer: number
  offres: RecruteurOffreItem[]
  aExaminerListe: RecruteurCandidatItem[]
}

export async function getRecruteurDashboard(cjsUid: string, organisationId: string | null): Promise<RecruteurDashboard> {
  const where = offreWhere(cjsUid, organisationId)
  const candWhere: Prisma.CandidatureWhereInput = { opportunite: where }

  const [offresActives, candidaturesRecues, aExaminer, offres, aExaminerListe] = await Promise.all([
    prisma.opportunite.count({ where: { ...where, statut: 'publiee' } }),
    prisma.candidature.count({ where: candWhere }),
    prisma.candidature.count({ where: { ...candWhere, statut: 'En_attente' } }),
    prisma.opportunite.findMany({
      where,
      select: { id: true, titre: true, statut: true, vues: true, _count: { select: { candidatures: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    prisma.candidature.findMany({
      where: { ...candWhere, statut: 'En_attente' },
      select: { id: true, statut: true, utilisateur: { select: { prenom: true, nom: true } }, opportunite: { select: { titre: true } } },
      orderBy: { soumiseA: 'desc' },
      take: 8,
    }),
  ])

  return {
    offresActives,
    candidaturesRecues,
    aExaminer,
    offres: offres.map((o) => ({ id: o.id, titre: o.titre, statut: o.statut, candidatures: o._count.candidatures, vues: o.vues })),
    aExaminerListe: aExaminerListe.map((c) => ({ id: c.id, prenom: c.utilisateur.prenom, nom: c.utilisateur.nom, statut: c.statut, offreTitre: c.opportunite.titre })),
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

/** Liste des candidatures reçues (page Candidatures). */
export async function getRecruteurCandidatures(cjsUid: string, organisationId: string | null): Promise<RecruteurCandidatItem[]> {
  const rows = await prisma.candidature.findMany({
    where: { opportunite: offreWhere(cjsUid, organisationId) },
    select: { id: true, statut: true, utilisateur: { select: { prenom: true, nom: true } }, opportunite: { select: { titre: true } } },
    orderBy: { soumiseA: 'desc' },
    take: 100,
  })
  return rows.map((c) => ({ id: c.id, prenom: c.utilisateur.prenom, nom: c.utilisateur.nom, statut: c.statut, offreTitre: c.opportunite.titre }))
}
