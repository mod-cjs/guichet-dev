/**
 * Loader du tableau de bord admin poussé (GUIC-679) — task-first + funnel héros.
 * Phase 2 : scope par PÉRIODE + RÉGION (drill-down national↔local).
 * Exécute les requêtes Prisma, délègue le calcul à `@/lib/dashboard-admin` (pur, testé).
 */
import type { Prisma, Region } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildFunnel, ratePct, avgSatisfaction, type FunnelStep } from '@/lib/dashboard-admin'
import { periodeFrom, periodeLabel, type DashboardFilters } from '@/lib/dashboard-filters'
export type { FunnelStep } from '@/lib/dashboard-admin'

export interface BriefingItem {
  key: 'moderation' | 'escalades' | 'curation'
  count: number
  context: string
  tone: 'crit' | 'warn' | 'info'
  href: string
  cta: string
}
export interface Kpi { key: string; label: string; value: string; delta?: string; deltaUp?: boolean }
export interface CentreSignal {
  id: string; nom: string; region: string; slug: string
  jeunes: number; reservationsEnAttente: number; frequentation30j: number; insertions: number
}
export interface YayeMetrics {
  escaladesOuvertes: number; escaladesDanger: number
  autoResolution: number | null; satisfaction: number | null; sessions: number; conversations: number
}
export interface PulseItem { action: string; resume: string; ago: string }
export interface UpcomingItem { label: string; when: string; kind: 'evenement' | 'curation' }
export interface OppTypeRow { type: string; label: string; total: number; aModerer: number }

export interface AdminDashboardData {
  briefing: BriefingItem[]
  funnel: FunnelStep[]
  funnelConversion: number
  kpis: Kpi[]
  centres: CentreSignal[]
  centresGeo: { id: string; nom: string; latitude: number; longitude: number; region: string; slug: string }[]
  yaye: YayeMetrics
  pulse: PulseItem[]
  upcoming: UpcomingItem[]
  oppByType: OppTypeRow[]
  /** Portée nationale (curation, journal) non filtrable par région — vrai si une région est sélectionnée. */
  regionScoped: boolean
}

const DAY = 86_400_000

function frAgo(d: Date, now: number): string {
  const h = Math.floor((now - d.getTime()) / 3_600_000)
  if (h < 1) return "à l'instant"
  if (h < 24) return `il y a ${h} h`
  return `il y a ${Math.floor(h / 24)} j`
}
function frWait(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  return h < 72 ? `${h} h` : `${Math.floor(h / 24)} j`
}
const OPP_LABEL: Record<string, string> = {
  Emploi: 'Emploi', Stage: 'Stage', Formation: 'Formation',
  Bourse: 'Bourse', Volontariat: 'Volontariat', Appel_a_projets: 'Appel à projets',
}

export async function loadAdminDashboard(filters: DashboardFilters): Promise<AdminDashboardData> {
  const now = Date.now()
  const nowD = new Date()
  const monthStart = new Date(nowD.getFullYear(), nowD.getMonth(), 1)
  const from = periodeFrom(filters.periode, nowD)
  const d30 = new Date(now - 30 * DAY)
  const hasRegion = filters.region !== 'all'
  const region = filters.region as Region

  // Centres de la région sélectionnée (dépendance pour scoper insertions/checkins/yaye).
  const regionCentreIds = hasRegion
    ? (await prisma.centre.findMany({ where: { region }, select: { id: true } })).map((c) => c.id)
    : null

  // Fragments de scope région (vides = national).
  const oppRegion: Prisma.OpportuniteWhereInput = hasRegion ? { region } : {}
  const userRegion: Prisma.UtilisateurWhereInput = hasRegion ? { region } : {}
  const candRegion: Prisma.CandidatureWhereInput = hasRegion ? { utilisateur: { region } } : {}
  const centreIdIn = <T extends { centreId?: unknown }>(): T =>
    (regionCentreIds ? { centreId: { in: regionCentreIds } } : {}) as T

  const candBase: Prisma.CandidatureWhereInput = { soumiseA: { gte: from }, ...candRegion }

  const [
    aModerer, moderationOldest,
    escaladesOuvertes, escaladesDanger,
    curationAValider, curationOldest,
    fReceived, fPresel, fEntretien, fRetenue, fInsertion,
    jeunes, jeunesMois, offresPubliees, insertionsPeriode, partenairesActifs,
    centresRaw,
    yayeSessions, yayeResolus, yayeConverted, yayeFeedbackRaw,
    auditRaw, evenementsAVenir, curationRecent,
    oppGroups, oppBrouillonGroups,
  ] = await Promise.all([
    prisma.opportunite.count({ where: { statut: 'brouillon', deletedAt: null, ...oppRegion } }),
    prisma.opportunite.findFirst({ where: { statut: 'brouillon', deletedAt: null, ...oppRegion }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    prisma.escaladeYaye.count({ where: { statut: 'en_attente', ...centreIdIn<Prisma.EscaladeYayeWhereInput>() } }),
    prisma.escaladeYaye.count({ where: { statut: 'en_attente', priorite: { gt: 0 }, ...centreIdIn<Prisma.EscaladeYayeWhereInput>() } }),
    prisma.itemCuration.count({ where: { statut: 'a_valider' } }),
    prisma.itemCuration.findFirst({ where: { statut: 'a_valider' }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    // Funnel (scopé période + région)
    prisma.candidature.count({ where: candBase }),
    prisma.candidature.count({ where: { ...candBase, pipelineStage: { in: ['Preselection', 'Entretien', 'Decision'] } } }),
    prisma.candidature.count({ where: { ...candBase, pipelineStage: { in: ['Entretien', 'Decision'] } } }),
    prisma.candidature.count({ where: { ...candBase, statut: 'Retenue' } }),
    prisma.insertion.count({ where: { dateInsertion: { gte: from }, ...centreIdIn<Prisma.InsertionWhereInput>() } }),
    // KPIs
    prisma.utilisateur.count({ where: { deletedAt: null, ...userRegion } }),
    prisma.utilisateur.count({ where: { deletedAt: null, createdAt: { gte: monthStart }, ...userRegion } }),
    prisma.opportunite.count({ where: { statut: 'publiee', deletedAt: null, ...oppRegion } }),
    prisma.insertion.count({ where: { dateInsertion: { gte: from }, ...centreIdIn<Prisma.InsertionWhereInput>() } }),
    prisma.organisation.count({ where: { estVerifie: true, ...(hasRegion ? { region } : {}) } }),
    // Centres (scope région)
    prisma.centre.findMany({
      where: { estActif: true, ...(hasRegion ? { region } : {}) },
      select: { id: true, nom: true, region: true, slug: true, latitude: true, longitude: true, _count: { select: { profilsRattaches: true } } },
      orderBy: { nom: 'asc' },
    }),
    // Yaye (scope période + région)
    prisma.yayeSessionSummary.count({ where: { calculeLe: { gte: from }, ...centreIdIn<Prisma.YayeSessionSummaryWhereInput>() } }),
    prisma.yayeSessionSummary.count({ where: { calculeLe: { gte: from }, resolu: true, ...centreIdIn<Prisma.YayeSessionSummaryWhereInput>() } }),
    prisma.yayeSessionSummary.count({ where: { calculeLe: { gte: from }, converti: true, ...centreIdIn<Prisma.YayeSessionSummaryWhereInput>() } }),
    // Feedback n'a pas de centreId → scopé par période uniquement (satisfaction réseau).
    prisma.yayeFeedback.findMany({ where: { createdAt: { gte: from } }, select: { note: true } }),
    // Pouls (national — activité admin)
    prisma.auditLog.findMany({ where: { createdAt: { gte: from } }, orderBy: { createdAt: 'desc' }, take: 8, select: { action: true, meta: true, createdAt: true } }),
    prisma.evenement.findMany({ where: { statut: 'a_venir', ...centreIdIn<Prisma.EvenementWhereInput>() }, orderBy: { dateDebut: 'asc' }, take: 4, select: { titre: true, dateDebut: true } }),
    prisma.itemCuration.count({ where: { statut: 'a_valider', createdAt: { lt: d30 } } }),
    // Opp by type (scope région)
    prisma.opportunite.groupBy({ by: ['type'], where: { statut: 'publiee', deletedAt: null, ...oppRegion }, _count: { _all: true } }),
    prisma.opportunite.groupBy({ by: ['type'], where: { statut: 'brouillon', deletedAt: null, ...oppRegion }, _count: { _all: true } }),
  ])

  // ── Briefing ──────────────────────────────────────────────────────────────
  const briefing: BriefingItem[] = []
  if (aModerer > 0) {
    const ageMs = moderationOldest ? now - moderationOldest.createdAt.getTime() : 0
    const ageH = Math.floor(ageMs / 3_600_000)
    briefing.push({
      key: 'moderation', count: aModerer, tone: ageH >= 48 ? 'crit' : 'warn',
      context: ageH >= 48 ? `la plus ancienne attend ${frWait(ageMs)} (SLA < 48 h dépassé)` : `à traiter · la plus ancienne il y a ${ageH} h`,
      href: '/admin/opportunites', cta: 'Traiter la file',
    })
  }
  if (escaladesOuvertes > 0) {
    briefing.push({
      key: 'escalades', count: escaladesOuvertes, tone: escaladesDanger > 0 ? 'crit' : 'warn',
      context: escaladesDanger > 0 ? `${escaladesDanger} signalée(s) DANGER — à reprendre en priorité` : 'conversations à reprendre en humain',
      href: '/admin/yaye/escalades', cta: 'Voir les escalades',
    })
  }
  if (curationAValider > 0) {
    const ageJ = curationOldest ? Math.floor((now - curationOldest.createdAt.getTime()) / DAY) : 0
    briefing.push({
      key: 'curation', count: curationAValider, tone: 'info',
      context: ageJ >= 7 ? `la plus ancienne depuis ${ageJ} j` : 'offres veillées à valider avant publication',
      href: '/admin/curation', cta: 'Ouvrir la file',
    })
  }
  const order = { crit: 0, warn: 1, info: 2 }
  briefing.sort((a, b) => order[a.tone] - order[b.tone])

  // ── Funnel ────────────────────────────────────────────────────────────────
  const funnel = buildFunnel([
    { key: 'recue', label: 'Reçues', count: fReceived },
    { key: 'preselection', label: 'Présélection', count: fPresel },
    { key: 'entretien', label: 'Entretien', count: fEntretien },
    { key: 'retenue', label: 'Retenues', count: fRetenue },
    { key: 'insertion', label: 'Insertion', count: fInsertion },
  ])
  const funnelConversion = ratePct(fInsertion, fReceived)

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const perLabel = periodeLabel(filters.periode).toLowerCase()
  const kpis: Kpi[] = [
    { key: 'jeunes', label: 'Jeunes inscrits', value: jeunes.toLocaleString('fr-FR'), delta: `+${jeunesMois.toLocaleString('fr-FR')} ce mois`, deltaUp: true },
    { key: 'offres', label: 'Offres publiées', value: offresPubliees.toLocaleString('fr-FR') },
    { key: 'insertions', label: `Insertions · ${perLabel}`, value: insertionsPeriode.toLocaleString('fr-FR'), delta: fReceived > 0 ? `${funnelConversion}% du parcours` : undefined, deltaUp: true },
    { key: 'partenaires', label: 'Partenaires vérifiés', value: partenairesActifs.toLocaleString('fr-FR') },
  ]

  // ── Centres par signal ────────────────────────────────────────────────────
  const centreIds = centresRaw.map((c) => c.id)
  const [resAttente, freq30] = await Promise.all([
    prisma.reservation.groupBy({ by: ['centreId'], where: { statut: 'EnAttente', centreId: { in: centreIds } }, _count: { _all: true } }),
    prisma.checkIn.groupBy({ by: ['centreId'], where: { effectueA: { gte: d30 }, centreId: { in: centreIds } }, _count: { _all: true } }),
  ])
  const insByCentre = await prisma.insertion.groupBy({ by: ['centreId'], where: { centreId: { in: centreIds } }, _count: { _all: true } })
  const resMap = new Map(resAttente.map((r) => [r.centreId, r._count._all]))
  const freqMap = new Map(freq30.map((r) => [r.centreId, r._count._all]))
  const insMap = new Map(insByCentre.map((r) => [r.centreId, r._count._all]))
  const centres: CentreSignal[] = centresRaw
    .map((c) => ({
      id: c.id, nom: c.nom, region: String(c.region), slug: c.slug ?? '',
      jeunes: c._count.profilsRattaches,
      reservationsEnAttente: resMap.get(c.id) ?? 0,
      frequentation30j: freqMap.get(c.id) ?? 0,
      insertions: insMap.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.reservationsEnAttente - a.reservationsEnAttente || b.frequentation30j - a.frequentation30j)
    .slice(0, 6)

  const centresGeo = centresRaw
    .filter((c) => !(c.latitude === 0 && c.longitude === 0))
    .map((c) => ({ id: c.id, nom: c.nom, latitude: c.latitude, longitude: c.longitude, region: String(c.region), slug: c.slug ?? '' }))

  // ── Yaye ──────────────────────────────────────────────────────────────────
  const yaye: YayeMetrics = {
    escaladesOuvertes, escaladesDanger,
    autoResolution: yayeSessions > 0 ? ratePct(yayeResolus, yayeSessions) : null,
    satisfaction: avgSatisfaction(yayeFeedbackRaw),
    sessions: yayeSessions, conversations: yayeConverted,
  }

  // ── Pouls ─────────────────────────────────────────────────────────────────
  const pulse: PulseItem[] = auditRaw.map((a) => {
    const meta = (a.meta ?? {}) as { resume?: string }
    return { action: a.action, resume: meta.resume ?? a.action, ago: frAgo(a.createdAt, now) }
  })
  const upcoming: UpcomingItem[] = [
    ...evenementsAVenir.map((e) => ({ label: e.titre, when: e.dateDebut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), kind: 'evenement' as const })),
    ...(curationRecent > 0 ? [{ label: `${curationRecent} item(s) de veille en attente > 7 j`, when: 'à traiter', kind: 'curation' as const }] : []),
  ].slice(0, 5)

  // ── Opportunités par type ─────────────────────────────────────────────────
  const brMap = new Map(oppBrouillonGroups.map((g) => [g.type, g._count._all]))
  const oppByType: OppTypeRow[] = oppGroups
    .map((g) => ({ type: String(g.type), label: OPP_LABEL[String(g.type)] ?? String(g.type), total: g._count._all, aModerer: brMap.get(g.type) ?? 0 }))
    .sort((a, b) => b.total - a.total)

  return { briefing, funnel, funnelConversion, kpis, centres, centresGeo, yaye, pulse, upcoming, oppByType, regionScoped: hasRegion }
}
