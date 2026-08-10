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

export const TRIS_MOD = ['ancien', 'recent', 'type', 'echeance'] as const
export type TriMod = (typeof TRIS_MOD)[number]

export function parseTriMod(v?: string): TriMod {
  return (TRIS_MOD as readonly string[]).includes(v ?? '') ? (v as TriMod) : 'ancien'
}

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
  deadline: Date | null
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
  /** Slug du type (pour le filtre par type). */
  typeSlug: string
  organisation: string
  source: SourceMod
  localisation: string
  /** Code région brut (enum) pour le filtre par région ; null si absent. */
  regionCode: string | null
  ageHeures: number
  ageLabel: string
  urgent: boolean
  /** Deadline ISO (yyyy-mm-dd) pour le tri par échéance + affichage ; null si absente. */
  deadlineIso: string | null
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
    typeSlug: r.type,
    organisation: r.organisationLibelle ?? r.organisation ?? r.org?.nom ?? '—',
    source,
    localisation: r.region ? (regionLabel(r.region) ?? r.region) : '',
    regionCode: r.region ?? null,
    ageHeures: h,
    ageLabel: ageLabel(h),
    urgent: h >= SEUIL_URGENT_H,
    deadlineIso: r.deadline ? r.deadline.toISOString().slice(0, 10) : null,
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

/** Tri de la file. `ancien` (défaut, priorité SLA) · `recent` · `type` (A-Z) · `echeance` (proche d'abord, nulles en dernier). */
export function trierModeration(rows: ModerationRow[], tri: TriMod): ModerationRow[] {
  const copie = [...rows]
  switch (tri) {
    case 'recent':
      return copie.sort((a, b) => a.ageHeures - b.ageHeures)
    case 'type':
      return copie.sort((a, b) => a.typeLabel.localeCompare(b.typeLabel, 'fr') || b.ageHeures - a.ageHeures)
    case 'echeance':
      return copie.sort((a, b) => {
        if (a.deadlineIso === b.deadlineIso) return b.ageHeures - a.ageHeures
        if (!a.deadlineIso) return 1 // nulle → en dernier
        if (!b.deadlineIso) return -1
        return a.deadlineIso.localeCompare(b.deadlineIso) // ISO trie chronologiquement
      })
    default: // 'ancien' : le plus vieux d'abord (âge décroissant)
      return copie.sort((a, b) => b.ageHeures - a.ageHeures)
  }
}

/** Filtres avancés cumulables : par type d'opportunité et/ou par région. */
export function filtrerAvance(rows: ModerationRow[], f: { typeSlug?: string; regionCode?: string }): ModerationRow[] {
  return rows.filter(
    (r) => (!f.typeSlug || r.typeSlug === f.typeSlug) && (!f.regionCode || r.regionCode === f.regionCode),
  )
}

export interface ModerationData {
  rows: ModerationRow[]
  total: number
  currentPage: number
  totalPages: number
  kpis: ModerationKpis
  /** F3 — IDs des offres vérifiées sur toute la file (pour « Approuver les vérifiés »). */
  verifiesIds: string[]
  /** F4 — la file dépasse le plafond de fetch : compteurs approximatifs. */
  tronque: boolean
  totalBrouillons: number
  /** Options des filtres avancés, calculées sur la file réelle (jamais de choix vide). */
  typesDispo: { slug: string; label: string }[]
  regionsDispo: { code: string; label: string }[]
}

/** Options distinctes (type/région) présentes dans la file, triées par libellé — pour les dropdowns. */
function optionsFiltres(rows: ModerationRow[]): Pick<ModerationData, 'typesDispo' | 'regionsDispo'> {
  const types = new Map<string, string>()
  const regions = new Map<string, string>()
  for (const r of rows) {
    if (!types.has(r.typeSlug)) types.set(r.typeSlug, r.typeLabel)
    if (r.regionCode && !regions.has(r.regionCode)) regions.set(r.regionCode, r.localisation || r.regionCode)
  }
  const parLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'fr')
  return {
    typesDispo: [...types].map(([slug, label]) => ({ slug, label })).sort(parLabel),
    regionsDispo: [...regions].map(([code, label]) => ({ code, label })).sort(parLabel),
  }
}

/**
 * Charge la file de modération : brouillons non supprimés, filtrés par recherche,
 * enrichis (source/âge/signaux), KPIs calculés sur l'ensemble puis filtre + pagination.
 */
export async function getModerationData(params: {
  q?: string
  filtre?: FiltreMod
  page?: number
  tri?: TriMod
  typeSlug?: string
  regionCode?: string
}): Promise<ModerationData> {
  const q = (params.q ?? '').trim()
  const filtre = params.filtre ?? 'tout'
  const tri = params.tri ?? 'ancien'
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
      deadline: true,
      description: true,
      remuneration: true,
      typeRef: { select: { libelle: true } },
      org: { select: { nom: true, estVerifie: true } },
      itemsCuration: { select: { id: true }, take: 1 },
    },
  })

  // F4 — total réel en base (peut dépasser le plafond de fetch → file tronquée).
  const totalBrouillons = await prisma.opportunite.count({ where })

  const now = Date.now()
  const all = raws.map((r) => mapModerationRow(r as ModerationRawRow, now))
  const kpis = kpisModeration(all)

  // Chip source/statut → filtres avancés (type/région) cumulables → tri → pagination.
  const cible = filtrerAvance(filtrerModeration(all, filtre), { typeSlug: params.typeSlug, regionCode: params.regionCode })
  const filtered = trierModeration(cible, tri)
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE_M))
  const currentPage = Math.min(page, totalPages)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE_M, currentPage * PAGE_SIZE_M)

  return {
    rows,
    total,
    currentPage,
    totalPages,
    kpis,
    // F3 — IDs vérifiés sur TOUTE la file (pas la page) pour « Approuver les vérifiés ».
    verifiesIds: idsVerifies(all),
    // F4 — signale une troncature au-delà du plafond (compteurs alors approximatifs).
    tronque: totalBrouillons > FETCH_CAP_M,
    totalBrouillons,
    ...optionsFiltres(all),
  }
}
