// Service de rollups Yaye (GUIC-435 — jalon A, couches 1-2).
// Agrège `agent_logs` en KPI opérationnels (C1) et d'efficacité conversationnelle (C2).
// Lecture seule sur un modèle EXISTANT ; n'écrit rien (la matérialisation dans
// YayeSessionSummary est gérée au jalon F).
//
// Spec : 14-metriques-performance-conversationnelle.md §1 (couches 1 & 2).

import { prisma } from '@/lib/prisma'
import type { CanalAgent, Prisma } from '@prisma/client'

export interface RollupFilters {
  from?: Date
  to?: Date
  canal?: CanalAgent
  centreId?: string
}

export interface RollupResult {
  periode: { from: string | null; to: string | null }
  sessions: number
  // ── Couche 1 — Opérationnel ──
  latenceTourMs: Percentiles // E2E par tour : message_recu → contenu_transmis
  tauxSuccesOutil: number // 0-1 (api_appelee succès / total)
  tauxErreurMoteur: number // 0-1 (sessions avec erreur / sessions)
  profondeurBoucle: { moyenne: number; distribution: Record<string, number> }
  tauxRequeteSeche: number // 0-1 (graph_interroge à 0 nœud / total graph_interroge)
  // ── Couche 2 — Efficacité conversationnelle ──
  toursParSession: Percentiles
  tauxConfinement: number // 0-1 (sessions sans escalade / sessions)
  tauxEscalade: number // 0-1
  tauxAbandon: number // 0-1 (message reçu mais aucun contenu transmis)
  // ── Ventilation ──
  parCanal: Record<string, { sessions: number; tauxEscalade: number; latenceP50Ms: number }>
}

export interface Percentiles {
  moyenne: number
  p50: number
  p95: number
  min: number
  max: number
}

/** Sous-ensemble de colonnes d'agent_logs nécessaires aux rollups. */
type LogRow = {
  sessionId: string
  canal: CanalAgent
  tsMs: bigint
  typeEvenement: string
  statut: string
  nodesReturned: Prisma.JsonValue
  payload: Prisma.JsonValue
}

function percentiles(values: number[]): Percentiles {
  if (values.length === 0) return { moyenne: 0, p50: 0, p95: 0, min: 0, max: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))]
  const sum = sorted.reduce((a, b) => a + b, 0)
  return {
    moyenne: Math.round(sum / sorted.length),
    p50: pick(0.5),
    p95: pick(0.95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  }
}

function jsonNum(v: Prisma.JsonValue, key: string): number | null {
  if (v && typeof v === 'object' && !Array.isArray(v) && key in v) {
    const x = (v as Record<string, unknown>)[key]
    if (typeof x === 'number' && Number.isFinite(x)) return x
  }
  return null
}

/** État agrégé d'UNE session, construit en un seul passage sur ses événements triés. */
interface SessionAgg {
  canal: CanalAgent
  tours: number
  /** Au moins une réponse livrée (reponse_generee OU contenu_transmis). */
  aReponse: boolean
  escalade: boolean
  erreur: boolean
  latencesTour: number[]
  // curseur du tour courant
  dernierMessageRecuMs: number | null
  /** Latence provisoire (reponse_generee), confirmée si pas de contenu_transmis ensuite. */
  latenceCandidate: number | null
}

/**
 * Calcule les KPI couches 1-2 sur la fenêtre/filtre donnés.
 * Stratégie : un seul `findMany` borné par date, regroupement en mémoire par session
 * (les événements d'une session sont peu nombreux ; la fenêtre borne le volume).
 */
export async function computeRollups(filters: RollupFilters = {}): Promise<RollupResult> {
  const where: Prisma.AgentLogWhereInput = {}
  if (filters.from || filters.to) {
    where.createdAt = {}
    if (filters.from) where.createdAt.gte = filters.from
    if (filters.to) where.createdAt.lte = filters.to
  }
  if (filters.canal) where.canal = filters.canal
  if (filters.centreId) where.centreId = filters.centreId

  const logs = (await prisma.agentLog.findMany({
    where,
    orderBy: [{ sessionId: 'asc' }, { tsMs: 'asc' }, { createdAt: 'asc' }],
    select: {
      sessionId: true,
      canal: true,
      tsMs: true,
      typeEvenement: true,
      statut: true,
      nodesReturned: true,
      payload: true,
    },
  })) as LogRow[]

  const sessions = new Map<string, SessionAgg>()
  // Compteurs globaux indépendants de la session.
  let apiTotal = 0
  let apiSucces = 0
  let graphTotal = 0
  let graphSeche = 0
  const rounds: number[] = []

  for (const log of logs) {
    let agg = sessions.get(log.sessionId)
    if (!agg) {
      agg = {
        canal: log.canal,
        tours: 0,
        aReponse: false,
        escalade: false,
        erreur: false,
        latencesTour: [],
        dernierMessageRecuMs: null,
        latenceCandidate: null,
      }
      sessions.set(log.sessionId, agg)
    }
    const tsMs = Number(log.tsMs)

    switch (log.typeEvenement) {
      case 'message_recu':
        // Clôt le tour précédent par sa latence provisoire (réponse sans contenu_transmis).
        if (agg.latenceCandidate != null) agg.latencesTour.push(agg.latenceCandidate)
        agg.tours += 1
        agg.dernierMessageRecuMs = tsMs
        agg.latenceCandidate = null
        break
      case 'contenu_transmis':
        // Livraison confirmée → latence définitive (prioritaire sur reponse_generee).
        agg.aReponse = true
        if (agg.dernierMessageRecuMs != null) {
          agg.latencesTour.push(tsMs - agg.dernierMessageRecuMs)
          agg.dernierMessageRecuMs = null
          agg.latenceCandidate = null
        }
        break
      case 'api_appelee':
        apiTotal += 1
        if (log.statut === 'succes') apiSucces += 1
        break
      case 'graph_interroge': {
        graphTotal += 1
        const count = jsonNum(log.nodesReturned, 'count')
        if (count === 0) graphSeche += 1
        break
      }
      case 'reponse_generee': {
        // Réponse générée = livraison (même si contenu_transmis n'est pas tracé).
        agg.aReponse = true
        if (agg.dernierMessageRecuMs != null && agg.latenceCandidate == null) {
          agg.latenceCandidate = tsMs - agg.dernierMessageRecuMs
        }
        const r = jsonNum(log.payload, 'rounds')
        if (r != null) rounds.push(r)
        break
      }
      case 'escalade_conseiller':
        agg.escalade = true
        break
      case 'erreur':
        agg.erreur = true
        if (log.statut === 'partiel') agg.escalade = true // max_tool_rounds → escalade proposée
        break
    }
  }

  const all = [...sessions.values()]
  // Flush des latences provisoires (dernier tour clos par reponse_generee sans contenu_transmis).
  for (const s of all) if (s.latenceCandidate != null) s.latencesTour.push(s.latenceCandidate)
  const nbSessions = all.length

  // Couche 1
  const latencesTour = all.flatMap((s) => s.latencesTour)
  const distribution: Record<string, number> = {}
  for (const r of rounds) distribution[String(r)] = (distribution[String(r)] ?? 0) + 1

  // Couche 2
  const toursValues = all.map((s) => s.tours)
  const escaladees = all.filter((s) => s.escalade).length
  const abandonnees = all.filter((s) => s.tours > 0 && !s.aReponse).length
  const enErreur = all.filter((s) => s.erreur).length

  // Ventilation par canal
  const parCanal: RollupResult['parCanal'] = {}
  for (const canal of new Set(all.map((s) => s.canal))) {
    const grp = all.filter((s) => s.canal === canal)
    const grpLat = grp.flatMap((s) => s.latencesTour)
    parCanal[canal] = {
      sessions: grp.length,
      tauxEscalade: grp.length ? grp.filter((s) => s.escalade).length / grp.length : 0,
      latenceP50Ms: percentiles(grpLat).p50,
    }
  }

  const ratio = (n: number, d: number) => (d > 0 ? n / d : 0)

  return {
    periode: {
      from: filters.from?.toISOString() ?? null,
      to: filters.to?.toISOString() ?? null,
    },
    sessions: nbSessions,
    latenceTourMs: percentiles(latencesTour),
    tauxSuccesOutil: ratio(apiSucces, apiTotal),
    tauxErreurMoteur: ratio(enErreur, nbSessions),
    profondeurBoucle: {
      moyenne: rounds.length ? Math.round((rounds.reduce((a, b) => a + b, 0) / rounds.length) * 100) / 100 : 0,
      distribution,
    },
    tauxRequeteSeche: ratio(graphSeche, graphTotal),
    toursParSession: percentiles(toursValues),
    tauxConfinement: ratio(nbSessions - escaladees, nbSessions),
    tauxEscalade: ratio(escaladees, nbSessions),
    tauxAbandon: ratio(abandonnees, nbSessions),
    parCanal,
  }
}
