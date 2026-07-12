// Recommandation proactive d'opportunités (GUIC-434, Lot 1e).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md §0 (corollaire) + 11 F2
//
// ⚠️ INVARIANT : un seul cerveau = le graphe. Les SIGNAUX viennent tous de
// traversées (reco collaborative + éligibilité) via le GraphPort — ce module
// n'invente aucun signal ; il les COMBINE par un blend de rang documenté
// (cf. COLLAB_WEIGHT/ELIGIBLE_WEIGHT) et MÉMOÏSE le résultat dans
// `RecommandationIA` (Prisma) comme CACHE explicable.
// Le réactif (query_knowledge_graph) et ce proactif partagent la même logique.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getGraphPort } from './graph'

export interface RecommandationResult {
  opportuniteId: string
  score: number
  raison: string
}

const round2 = (n: number) => Math.round(n * 100) / 100

// Pondérations du blend de rang (signaux normalisés ∈ [0,1]). Le collaboratif pèse
// davantage car c'est le signal de pertinence le plus discriminant ; l'éligibilité
// affine. Documentées et testées (yaye-recommandation.test) — ce n'est pas une
// boîte noire : la `raison` portée par chaque reco reste le chemin explicatif.
const COLLAB_WEIGHT = 0.6
const ELIGIBLE_WEIGHT = 0.4

/**
 * Calcule les recommandations par TRAVERSÉE du graphe (pas de scoring parallèle) :
 *  - signal collaboratif : popularité auprès de profils au parcours similaire ;
 *  - signal d'éligibilité : adéquation niveau d'étude / expérience, rang de la liste.
 * Le `raison` porte le chemin explicatif (spec §0 — explicabilité).
 */
export async function computeRecommandations(cjsUid: string, limit = 5): Promise<RecommandationResult[]> {
  const graph = getGraphPort()
  const [collab, eligibles] = await Promise.all([
    graph.collaborativeReco({ cjsUid }, 10).catch(() => []),
    graph.eligibleOpportunites({ cjsUid }, 10).catch(() => []),
  ])

  const acc = new Map<string, { score: number; raisons: string[] }>()
  const bump = (id: string, s: number, raison: string) => {
    const e = acc.get(id) ?? { score: 0, raisons: [] }
    e.score += s
    e.raisons.push(raison)
    acc.set(id, e)
  }

  // CONFIDENTIALITÉ (CDP) : le signal collaboratif sert au SCORE, mais la raison
  // affichée ne parle JAMAIS d'autres usagers ni de leur nombre — uniquement du
  // bénéficiaire conseillé.
  const maxPop = Math.max(1, ...collab.map(c => c.popularite))
  for (const c of collab) {
    bump(c.id, COLLAB_WEIGHT * (c.popularite / maxPop), 'correspond à ton parcours et tes centres d’intérêt')
  }
  eligibles.forEach((o, i) => {
    bump(o.id, ELIGIBLE_WEIGHT * (1 - i / Math.max(1, eligibles.length)), 'adaptée à ton niveau d’étude et ton profil')
  })

  return [...acc.entries()]
    .map(([opportuniteId, e]) => ({ opportuniteId, score: round2(e.score), raison: e.raisons[0] ?? '' }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Recalcule + persiste les recommandations dans `RecommandationIA` (cache). */
export async function refreshRecommandations(cjsUid: string, limit = 5): Promise<RecommandationResult[]> {
  const recos = await computeRecommandations(cjsUid, limit)
  try {
    await prisma.$transaction([
      prisma.recommandationIA.deleteMany({ where: { cjsUid } }),
      prisma.recommandationIA.createMany({
        data: recos.map(r => ({ cjsUid, opportuniteId: r.opportuniteId, score: r.score, raison: r.raison })),
      }),
    ])
  } catch (err) {
    logger.warn('[reco] persistance échouée (fail-soft)', { err: String(err) })
  }
  return recos
}

/**
 * Lecture des recommandations (outil `get_recommendations`, sans LLM).
 * Sert le cache `RecommandationIA` ; le warm-up paresseux recalcule si vide.
 */
export async function getRecommandations(cjsUid: string): Promise<RecommandationResult[]> {
  const cached = await prisma.recommandationIA.findMany({
    where: { cjsUid, opportuniteId: { not: null } },
    orderBy: { score: 'desc' },
    take: 5,
    select: { opportuniteId: true, score: true, raison: true },
  })
  if (cached.length > 0) {
    return cached.map(c => ({ opportuniteId: c.opportuniteId as string, score: c.score, raison: c.raison ?? '' }))
  }
  return refreshRecommandations(cjsUid).catch(() => [])
}

/**
 * PRÉCALCUL BATCH (spec 02 §0 — « même calcul exécuté en avance ») : recompute + persiste
 * les recommandations pour les bénéficiaires ACTIFS (≥1 candidature = signal collaboratif),
 * afin que `get_recommendations` et la contextualisation servent le cache (latence + push
 * proactif) au lieu de recalculer à la volée. Concurrence bornée. Fail-soft par utilisateur.
 */
export async function precomputeRecommandations(
  opts: { limit?: number; concurrency?: number; wipeStale?: boolean } = {},
): Promise<{ processed: number; failed: number; purged: number; durationMs: number }> {
  const started = Date.now()
  const concurrency = Math.max(1, Math.min(8, opts.concurrency ?? 4))
  // Purge COMPLÈTE du cache (reconstructible) avant repopulation : élimine les lignes
  // périmées OU issues d'anciennes versions — dont d'éventuelles `raison` qui divulgueraient
  // un agrégat d'autres usagers (garde CDP). Les inactifs se réchaufferont à la demande.
  let purged = 0
  if (opts.wipeStale !== false) {
    purged = (await prisma.recommandationIA.deleteMany({})).count
  }
  const rows = await prisma.candidature.findMany({
    distinct: ['cjsUid'],
    select: { cjsUid: true },
    orderBy: { soumiseA: 'desc' },
    ...(opts.limit ? { take: opts.limit } : {}),
  })
  const uids = rows.map(r => r.cjsUid)
  let processed = 0
  let failed = 0
  for (let i = 0; i < uids.length; i += concurrency) {
    await Promise.all(
      uids.slice(i, i + concurrency).map(uid =>
        refreshRecommandations(uid)
          .then(() => { processed++ })
          .catch(() => { failed++ }),
      ),
    )
  }
  return { processed, failed, purged, durationMs: Date.now() - started }
}
