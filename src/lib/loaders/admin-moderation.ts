/**
 * GUIC-702 — loader de la file de modération (offres brouillon).
 *
 * La file de modération est bornée par nature (offres en attente) → on récupère
 * l'ensemble filtré par recherche/source en base, puis on calcule EN MÉMOIRE les
 * signaux (heuristique), l'ancienneté et les KPIs. Aucune colonne « source »,
 * « signalé » ou « âge » n'existe : tout est dérivé.
 */
import { prisma } from '@/lib/prisma'
import { regionLabel } from '@/lib/regions'
import { detecterSignaux, niveauCarte, type NiveauSignal, type Signal } from '@/lib/moderation/signaux'

export const PAGE_SIZE_M = 20
/** Plafond de sécurité : au-delà, la file n'est plus « à traiter » mais un backlog à investiguer. */
const FETCH_CAP_M = 300

export const FILTRES_MOD = ['tout', 'signalees', 'nouvelles', 'recruteur', 'veille'] as const
export type FiltreMod = (typeof FILTRES_MOD)[number]

/** Seuil « nouvelle » (h) et seuil d'urgence SLA (h). */
const SEUIL_NOUVELLE_H = 24
const SEUIL_URGENT_H = 48

export type SourceMod = 'recruteur' | 'veille' | 'admin'

export interface ModerationRawRow {
  id: string
  slug: string
  titre: string
  type: string
  typeRef: { libelle: string } | null
  organisation: string
  organisationLibelle: string | null
  region: string | null
  recruteurUid: string | null
  createdAt: Date
  description: string
  remuneration: string | null
  org: { nom: string; estVerifie: boolean } | null
  itemsCuration: { id: string }[]
}

export interface ModerationRow {
  id: string
  slug: string
  titre: string
  typeLabel: string
  organisation: string
  source: SourceMod
  localisation: string
  ageHeures: number
  ageLabel: string
  urgent: boolean
  signaux: Signal[]
  niveau: NiveauSignal | null
  extrait: string
}

export interface ModerationKpis {
  tout: number
  signalees: number
  nouvelles: number
  recruteur: number
  veille: number
}

export function parseFiltreMod(v?: string): FiltreMod {
  return (FILTRES_MOD as readonly string[]).includes(v ?? '') ? (v as FiltreMod) : 'tout'
}

/** Source dérivée : dépôt recruteur prime, sinon rattachement veille, sinon admin. */
export function deriveSourceMod(row: { recruteurUid: string | null; itemsCuration: { id: string }[] }): SourceMod {
  if (row.recruteurUid) return 'recruteur'
  if (row.itemsCuration.length > 0) return 'veille'
  return 'admin'
}

export function ageHeures(createdAt: Date, now: number): number {
  return Math.round((now - createdAt.getTime()) / (3600 * 1000))
}

function ageLabel(h: number): string {
  if (h < 1) return 'en attente < 1 h'
  if (h < 48) return `en attente ${h} h`
  const j = Math.floor(h / 24)
  return `en attente ${j} j`
}

function extraitDe(description: string, max = 160): string {
  const plat = description.replace(/\s+/g, ' ').trim()
  return plat.length > max ? `${plat.slice(0, max - 1)}…` : plat
}

export function mapModerationRow(r: ModerationRawRow, now: number): ModerationRow {
  const source = deriveSourceMod(r)
  const h = ageHeures(r.createdAt, now)
  const signaux = detecterSignaux({
    titre: r.titre,
    description: r.description,
    remuneration: r.remuneration,
    source,
    partenaireVerifie: r.org?.estVerifie ?? false,
  })
  return {
    id: r.id,
    slug: r.slug,
    titre: r.titre,
    typeLabel: r.typeRef?.libelle ?? r.type,
    organisation: r.organisationLibelle ?? r.organisation ?? r.org?.nom ?? '—',
    source,
    localisation: r.region ? (regionLabel(r.region) ?? r.region) : '',
    ageHeures: h,
    ageLabel: ageLabel(h),
    urgent: h >= SEUIL_URGENT_H,
    signaux,
    niveau: niveauCarte(signaux),
    extrait: extraitDe(r.description),
  }
}

export function kpisModeration(rows: ModerationRow[]): ModerationKpis {
  return {
    tout: rows.length,
    signalees: rows.filter((r) => r.niveau !== null).length,
    nouvelles: rows.filter((r) => r.ageHeures < SEUIL_NOUVELLE_H).length,
    recruteur: rows.filter((r) => r.source === 'recruteur').length,
    veille: rows.filter((r) => r.source === 'veille').length,
  }
}

/** IDs des offres « vérifiées » = aucun signal (partenaire vérifié, rien de suspect). Cible de « Approuver les vérifiés ». */
export function idsVerifies(rows: ModerationRow[]): string[] {
  return rows.filter((r) => r.niveau === null).map((r) => r.id)
}

export function filtrerModeration(rows: ModerationRow[], filtre: FiltreMod): ModerationRow[] {
  switch (filtre) {
    case 'signalees':
      return rows.filter((r) => r.niveau !== null)
    case 'nouvelles':
      return rows.filter((r) => r.ageHeures < SEUIL_NOUVELLE_H)
    case 'recruteur':
      return rows.filter((r) => r.source === 'recruteur')
    case 'veille':
      return rows.filter((r) => r.source === 'veille')
    default:
      return rows
  }
}

export interface ModerationData {
  rows: ModerationRow[]
  total: number
  currentPage: number
  totalPages: number
  kpis: ModerationKpis
}

/**
 * Charge la file de modération : brouillons non supprimés, filtrés par recherche,
 * enrichis (source/âge/signaux), KPIs calculés sur l'ensemble puis filtre + pagination.
 */
export async function getModerationData(params: {
  q?: string
  filtre?: FiltreMod
  page?: number
}): Promise<ModerationData> {
  const q = (params.q ?? '').trim()
  const filtre = params.filtre ?? 'tout'
  const page = Math.max(1, params.page ?? 1)

  const where = {
    statut: 'brouillon' as const,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { titre: { contains: q } },
            { organisationLibelle: { contains: q } },
            { organisation: { contains: q } },
          ],
        }
      : {}),
  }

  const raws = await prisma.opportunite.findMany({
    where,
    orderBy: { createdAt: 'asc' }, // le plus ancien d'abord : priorité SLA
    take: FETCH_CAP_M,
    select: {
      id: true,
      slug: true,
      titre: true,
      type: true,
      organisation: true,
      organisationLibelle: true,
      region: true,
      recruteurUid: true,
      createdAt: true,
      description: true,
      remuneration: true,
      typeRef: { select: { libelle: true } },
      org: { select: { nom: true, estVerifie: true } },
      itemsCuration: { select: { id: true }, take: 1 },
    },
  })

  const now = Date.now()
  const all = raws.map((r) => mapModerationRow(r as ModerationRawRow, now))
  const kpis = kpisModeration(all)

  const filtered = filtrerModeration(all, filtre)
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE_M))
  const currentPage = Math.min(page, totalPages)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE_M, currentPage * PAGE_SIZE_M)

  return { rows, total, currentPage, totalPages, kpis }
}
