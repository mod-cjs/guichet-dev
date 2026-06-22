/**
 * Rapport YQS Yaye (GUIC-435) sur la base pointée par DATABASE_URL (= yaye_poc_enriched,
 * données test enrichies). Calcule le Yaye Quality Score sur les données réelles.
 *
 * Robuste à l'absence des tables métriques (migration non appliquée) : les couches 3
 * (juge) et 5 (feedback) tombent à null si leurs tables n'existent pas encore ; le score
 * est alors calculé sur les couches disponibles (1/2/4), avec renormalisation des poids.
 *
 * Usage : npx tsx scripts/yaye-yqs-report.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

import { prisma } from '@/lib/prisma'
import { computeRollups } from '@/lib/ia/metrics/rollups'
import { computeOutcomes } from '@/lib/ia/metrics/outcomes'
import { computeFeedbackKpis, type FeedbackKpis } from '@/lib/ia/metrics/feedback'
import { computeQualityAggregates, computeYqs, type QualityAggregates } from '@/lib/ia/metrics/yqs'

async function safe<T>(p: Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await p
  } catch (e) {
    console.log(`  ⚠ couche indisponible (${label}) : ${String((e as Error).message ?? e).split('\n')[0]}`)
    return fallback
  }
}

const moyenne = (...xs: (number | null)[]): number | null => {
  const v = xs.filter((x): x is number => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

const pct = (x: number | null) => (x == null ? '—' : `${(x * 100).toFixed(1)} %`)

async function main() {
  const total = await prisma.agentLog.count()
  console.log(`\n=== Données ===`)
  console.log(`agent_logs (événements tracés) : ${total}`)
  if (total === 0) {
    console.log(`\nAucune conversation Yaye tracée dans cette base → YQS non calculable.`)
    console.log(`(La base enrichie contient les données métier/graphe, mais pas de logs de conversation.)`)
    return
  }

  const sessions = await prisma.agentLog.findMany({ select: { sessionId: true }, distinct: ['sessionId'] })
  console.log(`sessions distinctes : ${sessions.length}`)

  const rollups = await computeRollups({})
  const outcomes = await computeOutcomes({})
  const feedback = await safe<FeedbackKpis>(
    computeFeedbackKpis({}),
    { total: 0, positifs: 0, negatifs: 0, csat: null },
    'feedback (couche 5)',
  )
  const qualite = await safe<QualityAggregates>(
    computeQualityAggregates({}),
    { count: 0, fidelite: null, pertinence: null, utilite: null, persona: null, conformiteCdp: null, langue: null, drapeauxRouges: 0 },
    'juge (couche 3)',
  )

  const couches = {
    operationnel: moyenne(rollups.tauxSuccesOutil, 1 - rollups.tauxErreurMoteur, 1 - rollups.tauxRequeteSeche),
    efficacite: moyenne(rollups.tauxConfinement, 1 - rollups.tauxAbandon),
    qualite: moyenne(qualite.fidelite, qualite.pertinence, qualite.utilite, qualite.persona, qualite.conformiteCdp, qualite.langue),
    resultat: outcomes.tauxConversionReco,
    satisfaction: feedback.csat,
  }
  const result = computeYqs(couches, { fidelite: qualite.fidelite, conformiteCdp: qualite.conformiteCdp })

  console.log(`\n=== Couches (0-100) ===`)
  console.log(`  1. Opérationnel  : ${pct(couches.operationnel)}   (succès outil ${pct(rollups.tauxSuccesOutil)}, erreur ${pct(rollups.tauxErreurMoteur)}, req. sèche ${pct(rollups.tauxRequeteSeche)})`)
  console.log(`  2. Efficacité    : ${pct(couches.efficacite)}   (confinement ${pct(rollups.tauxConfinement)}, abandon ${pct(rollups.tauxAbandon)})`)
  console.log(`  3. Qualité (juge): ${pct(couches.qualite)}   (${qualite.count} conversation(s) jugée(s))`)
  console.log(`  4. Résultat      : ${pct(couches.resultat)}   (conversion reco→candidature ${outcomes.recosConverties}/${outcomes.recosVues})`)
  console.log(`  5. Satisfaction  : ${pct(couches.satisfaction)}   (CSAT, ${feedback.total} retour(s))`)

  console.log(`\n=== YAYE QUALITY SCORE ===`)
  console.log(`  YQS = ${result.yqs == null ? '— (aucune couche disponible)' : `${result.yqs} / 100`}`)
  console.log(`  Garde-fous : ${result.drapeauRouge ? '🔴 DRAPEAU ROUGE' + (result.plafonne ? ' (YQS plafonné à 50)' : '') : '🟢 OK'}`)
  console.log(`  Latence par tour : P50 ${rollups.latenceTourMs.p50} ms · P95 ${rollups.latenceTourMs.p95} ms`)
  console.log('')
}

main()
  .catch((e) => {
    console.error('Échec du rapport :', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
