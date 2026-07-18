// Sonde de SANTÉ / RICHESSE du Knowledge Graph (jalon E+ — étape 3).
// Déterministe, sur de VRAIS bénéficiaires (pas de LLM) → objective la promesse « atout majeur » :
// le graphe sait-il, pour un jeune, proposer une offre éligible, pointer un écart de compétences,
// ET la formation qui le comble ? Détecte une régression de DONNÉES (ex. DEVELOPPE vidé) que
// l'éval conversationnelle ne verrait pas.
//
// Usage : npx tsx scripts/yaye-graph-health.ts [rapport.json] [taille-echantillon]

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { prisma } from '@/lib/prisma'
import { getGraphPort } from '@/lib/ia/graph'

async function main() {
  const out = process.argv[2] || '/app/scratch-eval/graph-health.json'
  const sampleSize = Number(process.argv[3] || 150)
  const graph = getGraphPort()

  const [skills, requiertTrue, developpe, formations] = await Promise.all([
    prisma.skill.count(),
    prisma.opportuniteSkill.count({ where: { requise: true } }),
    prisma.opportuniteSkill.count({ where: { requise: false } }),
    prisma.opportuniteFormation.count(),
  ])

  const rows = await prisma.candidature.findMany({ distinct: ['cjsUid'], select: { cjsUid: true }, take: sampleSize })
  const uids = rows.map(r => r.cjsUid)

  let withEligible = 0
  let withGap = 0
  let gapWithFormation = 0
  let formationsSum = 0
  for (const uid of uids) {
    const elig = await graph.eligibleOpportunites({ cjsUid: uid }, 1).catch(() => [])
    if (elig.length === 0) continue
    withEligible++
    const gap = await graph.skillGap({ cjsUid: uid }, elig[0].id).catch(() => null)
    if (gap && gap.manquantes.length > 0) {
      withGap++
      if (gap.formations.length > 0) {
        gapWithFormation++
        formationsSum += gap.formations.length
      }
    }
  }

  const n = uids.length
  const report = {
    backend: graph.backend,
    graph: { skills, requiertTrue, developpe, formations },
    sample: n,
    coverage: {
      eligiblePct: n ? Number((withEligible / n).toFixed(3) ) : 0,
      gapPct: withEligible ? Number((withGap / withEligible).toFixed(3)) : 0,
      // LE métrique clé : quand il y a un écart, a-t-on une formation pour le combler ?
      gapWithFormationPct: withGap ? Number((gapWithFormation / withGap).toFixed(3)) : 0,
      avgFormationsPerGap: gapWithFormation ? Number((formationsSum / gapWithFormation).toFixed(2)) : 0,
    },
  }

  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(report, null, 2), 'utf-8')
  console.log(JSON.stringify(report.graph))
  console.log('couverture:', JSON.stringify(report.coverage))
  process.exit(0)
}

main().catch(e => { console.error('ERREUR:', e); process.exit(1) })
