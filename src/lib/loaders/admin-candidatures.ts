import { prisma } from '@/lib/prisma'
import type { Prisma, StatutCandidature, StatutPipeline } from '@prisma/client'

/**
 * Loader Candidatures (admin — SUPERVISION, GUIC-692). Helpers purs (testables sans DB)
 * + agrégation funnel/KPIs. L'admin supervise : voir/filtrer/exporter/relancer — il ne
 * décide jamais (Retenir/Refuser = recruteur).
 *
 * ⚠️ Garde-fou (spike Étape 0) : ne JAMAIS faire `include:{opportunite:true}` — l'adapter
 * MariaDB lève un TransformError sur la relecture d'une colonne d'`opportunites`. Toujours
 * un `select` ciblé.
 */

export const PAGE_SIZE = 20
export const SEUIL_RELANCE_MS = 14 * 86_400_000

const STATUTS = new Set<StatutCandidature>(['En_attente', 'Vue', 'Retenue', 'Refusee'])
const ETAPES = new Set<StatutPipeline>(['Recue', 'Preselection', 'Entretien', 'Decision'])
export type SortCand = 'score' | 'recent'

export function parseStatutCand(v: string | undefined): StatutCandidature | '' {
  return v && STATUTS.has(v as StatutCandidature) ? (v as StatutCandidature) : ''
}
export function parseEtapeCand(v: string | undefined): StatutPipeline | '' {
  return v && ETAPES.has(v as StatutPipeline) ? (v as StatutPipeline) : ''
}
export function parseSortCand(v: string | undefined): SortCand {
  return v === 'score' ? 'score' : 'recent'
}

/** WHERE : recherche transversale (candidat / offre / recruteur) + statut + étape. */
export function buildCandidatureWhere(opts: { q: string; statut: StatutCandidature | ''; etape: StatutPipeline | '' }): Prisma.CandidatureWhereInput {
  const { q, statut, etape } = opts
  const where: Prisma.CandidatureWhereInput = {}
  if (q) {
    where.OR = [
      { utilisateur: { nom: { contains: q } } },
      { utilisateur: { prenom: { contains: q } } },
      { opportunite: { titre: { contains: q } } },
      { opportunite: { organisation: { contains: q } } },
      { opportunite: { organisationLibelle: { contains: q } } },
    ]
  }
  if (statut) where.statut = statut
  if (etape) where.pipelineStage = etape
  return where
}

export function orderByForSort(sort: SortCand): Prisma.CandidatureOrderByWithRelationInput[] {
  return sort === 'score'
    ? [{ scoreAdequation: { sort: 'desc', nulls: 'last' } }]
    : [{ soumiseA: 'desc' }]
}

// ─── Ligne de table ──────────────────────────────────────────────────────────
export interface CandidatureRowInput {
  id: string
  statut: StatutCandidature
  soumiseA: Date
  utilisateur: { cjsUid: string; prenom: string; nom: string }
  opportunite: { id: string; titre: string; organisation: string; organisationLibelle: string | null; org?: { nom: string } | null }
  scoreAdequation: number | null
  pipelineStage: StatutPipeline
  favoriRecruteur: boolean
}

export interface CandidatureRow {
  id: string
  candidatCjsUid: string
  candidatPrenom: string
  candidatNom: string
  opportuniteId: string
  opportuniteTitre: string
  /** Recruteur : Organisation liée (org.nom) sinon libellé/texte libre de l'offre. */
  recruteur: string
  statut: StatutCandidature
  soumiseA: Date
  enRetard: boolean
  score: number | null
  etape: StatutPipeline
  favori: boolean
}

export function mapCandidatureRow(c: CandidatureRowInput, now: Date = new Date()): CandidatureRow {
  return {
    id: c.id,
    candidatCjsUid: c.utilisateur.cjsUid,
    candidatPrenom: c.utilisateur.prenom,
    candidatNom: c.utilisateur.nom,
    opportuniteId: c.opportunite.id,
    opportuniteTitre: c.opportunite.titre,
    recruteur: c.opportunite.org?.nom ?? c.opportunite.organisationLibelle ?? c.opportunite.organisation,
    statut: c.statut,
    soumiseA: c.soumiseA,
    enRetard: c.statut === 'En_attente' && c.soumiseA.getTime() < now.getTime() - SEUIL_RELANCE_MS,
    score: c.scoreAdequation,
    etape: c.pipelineStage,
    favori: c.favoriRecruteur,
  }
}

// ─── Funnel & KPIs ─────────────────────────────────────────────────────────────
export interface CandidaturesFunnel { recue: number; preselection: number; entretien: number; decision: number; retenue: number; conversionPct: number }
export interface CandidaturesKpis { enAttente: number; vues: number; retenues: number; scoreMoyen: number; insertions: number }

type PipeCount = { pipelineStage: StatutPipeline; _count: { id: number } }
type StatutCount = { statut: StatutCandidature; _count: { id: number } }

export function funnelFromCounts(counts: PipeCount[], retenue = 0): CandidaturesFunnel {
  const by = (s: StatutPipeline) => counts.find((c) => c.pipelineStage === s)?._count.id ?? 0
  const recue = by('Recue')
  // Conversion = retenues / reçues (1 décimale, fidèle maquette « 13,9 % »).
  const conversionPct = recue > 0 ? Math.round((retenue / recue) * 1000) / 10 : 0
  return { recue, preselection: by('Preselection'), entretien: by('Entretien'), decision: by('Decision'), retenue, conversionPct }
}

export function kpisFromCounts(counts: StatutCount[], scoreMoyenRaw: number | null, insertions: number): CandidaturesKpis {
  const by = (s: StatutCandidature) => counts.find((c) => c.statut === s)?._count.id ?? 0
  return {
    enAttente: by('En_attente'),
    vues: by('Vue'),
    retenues: by('Retenue'),
    scoreMoyen: scoreMoyenRaw == null ? 0 : Math.round(scoreMoyenRaw),
    insertions,
  }
}

// ─── Agrégat complet (async, DB) ───────────────────────────────────────────────
export interface CandidaturesData {
  rows: CandidatureRow[]
  total: number
  totalPages: number
  funnel: CandidaturesFunnel
  kpis: CandidaturesKpis
  bloqueesCount: number
}

export async function getCandidaturesData(params: { page: number; q: string; statut: string; etape: string; sort: string }): Promise<CandidaturesData> {
  const page = Math.max(1, params.page || 1)
  const q = params.q.trim()
  const statut = parseStatutCand(params.statut)
  const etape = parseEtapeCand(params.etape)
  const sort = parseSortCand(params.sort)
  const where = buildCandidatureWhere({ q, statut, etape })
  // Compteurs funnel/KPIs : filtrés par la recherche mais pas par statut/étape.
  const scope = buildCandidatureWhere({ q, statut: '', etape: '' })
  const now = new Date()
  const seuil = new Date(now.getTime() - SEUIL_RELANCE_MS)

  const [rowsRaw, total, pipeCounts, statutCounts, scoreAgg, insertions, bloqueesCount] = await Promise.all([
    prisma.candidature.findMany({
      where,
      orderBy: orderByForSort(sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, statut: true, soumiseA: true, scoreAdequation: true, pipelineStage: true, favoriRecruteur: true,
        utilisateur: { select: { cjsUid: true, prenom: true, nom: true } },
        // Garde-fou spike : select ciblé (jamais include plein → TransformError adapter MariaDB).
        opportunite: { select: { id: true, titre: true, organisation: true, organisationLibelle: true, org: { select: { nom: true } } } },
      },
    }),
    prisma.candidature.count({ where }),
    prisma.candidature.groupBy({ by: ['pipelineStage'], where: scope, _count: { id: true } }),
    prisma.candidature.groupBy({ by: ['statut'], where: scope, _count: { id: true } }),
    prisma.candidature.aggregate({ where: scope, _avg: { scoreAdequation: true } }),
    prisma.insertion.count(),
    prisma.candidature.count({ where: { ...scope, statut: 'En_attente', soumiseA: { lt: seuil } } }),
  ])

  const retenue = statutCounts.find((s) => s.statut === 'Retenue')?._count.id ?? 0
  return {
    rows: rowsRaw.map((c) => mapCandidatureRow(c as CandidatureRowInput, now)),
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
    funnel: funnelFromCounts(pipeCounts as PipeCount[], retenue),
    kpis: kpisFromCounts(statutCounts as StatutCount[], scoreAgg._avg.scoreAdequation, insertions),
    bloqueesCount,
  }
}
