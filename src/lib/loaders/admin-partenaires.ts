/**
 * GUIC-704 — loader de la console Partenaires (organisations recruteurs).
 *
 * Partenaire = Organisation (naît côté recruteur/SSO — pas de création admin) + son
 * COMPTE recruteur (`Utilisateur` par `cjsUid`). On agrège en base les vrais chiffres
 * (offres publiées, candidatures reçues) et on joint le statut du compte, puis on filtre
 * (secteur / vérifié / suspendu) et on trie EN MÉMOIRE sur un lot borné — comme la
 * modération. « Suspendu » vit sur le compte recruteur (pas une colonne Organisation),
 * d'où le filtre en mémoire.
 */
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export const PAGE_SIZE_P = 20
const FETCH_CAP_P = 500

export const STATUTS_PARTENAIRE = ['tous', 'verifies', 'non_verifies', 'suspendus'] as const
export type StatutPartenaire = (typeof STATUTS_PARTENAIRE)[number]
export const TRIS_PARTENAIRE = ['nom', 'offres', 'candidatures', 'recent'] as const
export type TriPartenaire = (typeof TRIS_PARTENAIRE)[number]

/** Statut du compte recruteur propriétaire (Utilisateur.statut), `inconnu` si pas de compte. */
export type RecruteurStatut = 'actif' | 'inactif' | 'anonymise' | 'inconnu'

export function parseStatutPartenaire(v?: string): StatutPartenaire {
  return (STATUTS_PARTENAIRE as readonly string[]).includes(v ?? '') ? (v as StatutPartenaire) : 'tous'
}
export function parseTriPartenaire(v?: string): TriPartenaire {
  return (TRIS_PARTENAIRE as readonly string[]).includes(v ?? '') ? (v as TriPartenaire) : 'nom'
}

export interface OrgRaw {
  id: string
  nom: string
  description: string | null
  logoUrl: string | null
  secteur: string | null
  region: string | null
  email: string | null
  estVerifie: boolean
  cjsUid: string
  createdAt: Date
}

export interface AggOrg { total: number; publiees: number; candidatures: number }

export interface PartenaireRow {
  id: string
  nom: string
  description: string | null
  logoUrl: string | null
  secteur: string | null
  region: string | null
  email: string | null
  estVerifie: boolean
  cjsUid: string
  createdAt: Date
  opportunitesCount: number
  publieesCount: number
  candidaturesCount: number
  recruteurStatut: RecruteurStatut
}

export interface PartenaireKpis { tous: number; verifies: number; nonVerifies: number; suspendus: number }

/** Agrège les opportunités (statut + nb candidatures) par organisation. Pur → testable. */
export function agregerOpportunites(
  opps: Array<{ organisationId: string | null; statut: string; nbCandidatures: number }>,
): Record<string, AggOrg> {
  const out: Record<string, AggOrg> = {}
  for (const o of opps) {
    if (!o.organisationId) continue
    const a = (out[o.organisationId] ??= { total: 0, publiees: 0, candidatures: 0 })
    a.total += 1
    if (o.statut === 'publiee') a.publiees += 1
    a.candidatures += o.nbCandidatures
  }
  return out
}

export function mapPartenaireRow(r: OrgRaw, agg: AggOrg | undefined, recruteurStatut: RecruteurStatut | undefined): PartenaireRow {
  return {
    id: r.id,
    nom: r.nom,
    description: r.description,
    logoUrl: r.logoUrl,
    secteur: r.secteur,
    region: r.region,
    email: r.email,
    estVerifie: r.estVerifie,
    cjsUid: r.cjsUid,
    createdAt: r.createdAt,
    opportunitesCount: agg?.total ?? 0,
    publieesCount: agg?.publiees ?? 0,
    candidaturesCount: agg?.candidatures ?? 0,
    recruteurStatut: recruteurStatut ?? 'inconnu',
  }
}

export function kpisPartenaires(rows: PartenaireRow[]): PartenaireKpis {
  return {
    tous: rows.length,
    verifies: rows.filter((r) => r.estVerifie).length,
    nonVerifies: rows.filter((r) => !r.estVerifie).length,
    suspendus: rows.filter((r) => r.recruteurStatut === 'inactif').length,
  }
}

export function filtrerPartenaires(rows: PartenaireRow[], statut: StatutPartenaire): PartenaireRow[] {
  switch (statut) {
    case 'verifies':
      return rows.filter((r) => r.estVerifie)
    case 'non_verifies':
      return rows.filter((r) => !r.estVerifie)
    case 'suspendus':
      return rows.filter((r) => r.recruteurStatut === 'inactif')
    default:
      return rows
  }
}

export function trierPartenaires(rows: PartenaireRow[], tri: TriPartenaire): PartenaireRow[] {
  const copie = [...rows]
  switch (tri) {
    case 'offres':
      return copie.sort((a, b) => b.publieesCount - a.publieesCount || a.nom.localeCompare(b.nom, 'fr'))
    case 'candidatures':
      return copie.sort((a, b) => b.candidaturesCount - a.candidaturesCount || a.nom.localeCompare(b.nom, 'fr'))
    case 'recent':
      return copie.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    default: // 'nom'
      return copie.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }
}

export interface PartenairesData {
  rows: PartenaireRow[]
  total: number
  currentPage: number
  totalPages: number
  kpis: PartenaireKpis
  secteursDispo: string[]
}

/** Statut d'Utilisateur (enum) → RecruteurStatut. */
function versRecruteurStatut(s: string | undefined): RecruteurStatut | undefined {
  return s === 'actif' || s === 'inactif' || s === 'anonymise' ? s : undefined
}

export async function getPartenairesData(params: {
  q?: string
  secteur?: string
  statut?: StatutPartenaire
  tri?: TriPartenaire
  page?: number
}): Promise<PartenairesData> {
  const q = (params.q ?? '').trim()
  const statut = params.statut ?? 'tous'
  const tri = params.tri ?? 'nom'
  const page = Math.max(1, params.page ?? 1)

  const where: Prisma.OrganisationWhereInput = {
    ...(q ? { OR: [{ nom: { contains: q } }, { email: { contains: q } }] } : {}),
    ...(params.secteur ? { secteur: params.secteur as Prisma.OrganisationWhereInput['secteur'] } : {}),
  }

  const raws = (await prisma.organisation.findMany({
    where,
    orderBy: { nom: 'asc' },
    take: FETCH_CAP_P,
    select: {
      id: true, nom: true, description: true, logoUrl: true, secteur: true,
      region: true, email: true, estVerifie: true, cjsUid: true, createdAt: true,
    },
  })) as OrgRaw[]

  const ids = raws.map((r) => r.id)
  const cjsUids = [...new Set(raws.map((r) => r.cjsUid))]

  // 1 requête pour les agrégats : par opportunité (statut + nb candidatures), agrégée par org.
  const opps = ids.length
    ? await prisma.opportunite.findMany({
        where: { organisationId: { in: ids } },
        select: { organisationId: true, statut: true, _count: { select: { candidatures: true } } },
      })
    : []
  const agg = agregerOpportunites(opps.map((o) => ({ organisationId: o.organisationId, statut: o.statut, nbCandidatures: o._count.candidatures })))

  // Statut du compte recruteur par cjsUid.
  const users = cjsUids.length
    ? await prisma.utilisateur.findMany({ where: { cjsUid: { in: cjsUids } }, select: { cjsUid: true, statut: true } })
    : []
  const statutParUid = new Map(users.map((u) => [u.cjsUid, versRecruteurStatut(u.statut)]))

  const all = raws.map((r) => mapPartenaireRow(r, agg[r.id], statutParUid.get(r.cjsUid)))
  const kpis = kpisPartenaires(all)
  const secteursDispo = [...new Set(all.map((r) => r.secteur).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b, 'fr'))

  const filtered = trierPartenaires(filtrerPartenaires(all, statut), tri)
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE_P))
  const currentPage = Math.min(page, totalPages)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE_P, currentPage * PAGE_SIZE_P)

  return { rows, total, currentPage, totalPages, kpis, secteursDispo }
}
