// Recommandation proactive d'opportunités (GUIC-434, Lot 1e).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md §0 (corollaire) + 11 F2
//
// ⚠️ INVARIANT : un seul cerveau = le graphe. Ce module N'INVENTE AUCUN score —
// il ORCHESTRE des traversées (reco collaborative + éligibilité) via le GraphPort
// et MÉMOÏSE le résultat dans `RecommandationIA` (Prisma) comme CACHE explicable.
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

  const maxPop = Math.max(1, ...collab.map(c => c.popularite))
  for (const c of collab) {
    bump(c.id, 0.6 * (c.popularite / maxPop), `${c.popularite} profil(s) au parcours similaire y ont postulé`)
  }
  eligibles.forEach((o, i) => {
    bump(o.id, 0.4 * (1 - i / Math.max(1, eligibles.length)), 'correspond à votre niveau d’étude et votre profil')
  })

  return [...acc.entries()]
    .map(([opportuniteId, e]) => ({ opportuniteId, score: round2(e.score), raison: e.raisons.join(' · ') }))
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
