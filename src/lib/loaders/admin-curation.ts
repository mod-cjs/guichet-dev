/**
 * GUIC-704 · Lot 1 — loader de la file de curation (items à valider).
 * Helpers purs (mapping, chips, filtres) + chargement DB. Score = `scoreCompletude`
 * (complétude d'extraction), signaux dérivés du `payloadExtrait`. 0 migration.
 */
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { signauxCuration, type SignalCuration } from '@/lib/curation/signaux'

export const PAGE_SIZE_C = 20
/** Plafond de sécurité (file de suggestions). */
const FETCH_CAP_C = 300

export const ONGLETS_C = ['a_valider', 'en_attente', 'approuvee', 'rejetee'] as const
export type OngletC = (typeof ONGLETS_C)[number]
export function parseOngletC(v?: string): OngletC {
  return (ONGLETS_C as readonly string[]).includes(v ?? '') ? (v as OngletC) : 'a_valider'
}

export type ChipC = 'tout' | 'score' | 'doublons'
const SCORE_ELEVE = 70

export interface CurationRawRow {
  id: string
  titre: string | null
  scoreCompletude: number | null
  statut: string
  doublonDeId: string | null
  payloadExtrait: unknown
  urlCanonique: string
  source: { nom: string; url: string }
}

export interface CurationRow {
  id: string
  titre: string
  extrait: string
  typeLabel: string | null
  sourceNom: string
  sourceOfficielle: boolean
  score: number
  signaux: SignalCuration[]
  estDoublon: boolean
  /** Prêt pour « → Modération » : titre ET type identifiés (exigés par l'approbation). */
  complet: boolean
}

function payloadDe(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

export function mapCurationRow(r: CurationRawRow, typeLabel: string | null): CurationRow {
  const p = payloadDe(r.payloadExtrait)
  const desc = typeof p.description === 'string' ? p.description : ''
  return {
    id: r.id,
    titre: r.titre?.trim() || '(sans titre)',
    extrait: desc.replace(/\s+/g, ' ').trim().slice(0, 160),
    typeLabel,
    sourceNom: r.source.nom,
    sourceOfficielle: /gouv\.sn/i.test(r.source.url),
    score: r.scoreCompletude ?? 0,
    signaux: signauxCuration({
      titre: r.titre,
      payload: p,
      statut: r.statut,
      doublonDeId: r.doublonDeId,
      sourceUrl: r.source.url,
    }),
    estDoublon: r.statut === 'doublon' || !!r.doublonDeId,
    complet: !!r.titre?.trim() && typeof p.typeId === 'string' && p.typeId.trim() !== '',
  }
}

export function chipsCuration(rows: CurationRow[]): { suggerees: number; scoreEleve: number; doublons: number } {
  return {
    suggerees: rows.length,
    scoreEleve: rows.filter((r) => r.score >= SCORE_ELEVE).length,
    doublons: rows.filter((r) => r.estDoublon).length,
  }
}

export function filtrerCuration(rows: CurationRow[], chip: ChipC): CurationRow[] {
  if (chip === 'score') return rows.filter((r) => r.score >= SCORE_ELEVE)
  if (chip === 'doublons') return rows.filter((r) => r.estDoublon)
  return rows
}

export interface VeilleBandeau {
  nbSources: number
  derniereCollecte: Date | null
  sourcesNoms: string[]
}

export interface CurationData {
  rows: CurationRow[]
  total: number
  currentPage: number
  totalPages: number
  chips: { suggerees: number; scoreEleve: number; doublons: number }
  onglet: OngletC
  veille: VeilleBandeau
}

/**
 * Charge la file de curation. Vue « Suggérées » = a_valider + doublon (pour la puce
 * doublon inline) ; onglets en_attente/approuvee/rejetee = statut seul.
 */
export async function getCurationData(params: {
  onglet?: OngletC
  chip?: ChipC
  source?: string
  scoreMin?: number
  page?: number
}): Promise<CurationData> {
  const onglet = params.onglet ?? 'a_valider'
  const chip = params.chip ?? 'tout'
  const page = Math.max(1, params.page ?? 1)

  const statutWhere: Prisma.ItemCurationWhereInput =
    onglet === 'a_valider' ? { statut: { in: ['a_valider', 'doublon'] } } : { statut: onglet }
  const where: Prisma.ItemCurationWhereInput = {
    ...statutWhere,
    ...(params.source ? { sourceId: params.source } : {}),
    ...(params.scoreMin && params.scoreMin > 0 ? { scoreCompletude: { gte: params.scoreMin } } : {}),
  }

  const [raws, sources, derniereExec] = await Promise.all([
    prisma.itemCuration.findMany({
      where,
      orderBy: [{ scoreCompletude: 'desc' }, { createdAt: 'asc' }],
      take: FETCH_CAP_C,
      select: {
        id: true,
        titre: true,
        scoreCompletude: true,
        statut: true,
        doublonDeId: true,
        payloadExtrait: true,
        urlCanonique: true,
        source: { select: { nom: true, url: true } },
      },
    }),
    prisma.sourceVeille.findMany({ where: { actif: true }, select: { nom: true }, orderBy: { nom: 'asc' } }),
    prisma.executionVeille.findFirst({ orderBy: { demarreLe: 'desc' }, select: { demarreLe: true } }),
  ])

  // Résout les libellés de type depuis payload.typeId (une requête bornée à la page).
  const typeIds = [...new Set(raws.map((r) => {
    const p = payloadDe(r.payloadExtrait)
    return typeof p.typeId === 'string' ? p.typeId : null
  }).filter((x): x is string => !!x))]
  const types = typeIds.length
    ? await prisma.opportuniteType.findMany({ where: { id: { in: typeIds } }, select: { id: true, libelle: true } })
    : []
  const libelleById = new Map(types.map((t) => [t.id, t.libelle]))

  const all = raws.map((r) => {
    const p = payloadDe(r.payloadExtrait)
    const typeLabel = typeof p.typeId === 'string' ? (libelleById.get(p.typeId) ?? null) : null
    return mapCurationRow(r as unknown as CurationRawRow, typeLabel)
  })

  const chips = chipsCuration(all)
  const filtered = filtrerCuration(all, chip)
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE_C))
  const currentPage = Math.min(page, totalPages)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE_C, currentPage * PAGE_SIZE_C)

  return {
    rows,
    total,
    currentPage,
    totalPages,
    chips,
    onglet,
    veille: {
      nbSources: sources.length,
      derniereCollecte: derniereExec?.demarreLe ?? null,
      sourcesNoms: sources.map((s) => s.nom),
    },
  }
}
