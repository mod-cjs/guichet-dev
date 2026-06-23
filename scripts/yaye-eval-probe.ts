/**
 * Sonde le pipeline d'éval sur la base (GUIC-435). Montre combien de conversations
 * sont candidates vs jugeables (= avec texte verbatim). Sur du web pur, tout est ignoré
 * faute de texte durable (CDP). Usage : npx tsx scripts/yaye-eval-probe.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

import { prisma } from '@/lib/prisma'
import { runEval } from '@/lib/ia/metrics/eval-run'

async function main() {
  const from = new Date('2000-01-01')
  const to = new Date()
  // Throttle pour rester sous le rate-limit Groq (palier gratuit ~30 req/min).
  const delayMs = Number(process.env.YAYE_EVAL_DELAY_MS ?? 2200)
  const report = await runEval({ from, to, sampleSize: 200, delayMs })
  console.log('\n=== Pipeline d’éval sur toute la base ===')
  console.log(`  candidats (sessions vues)      : ${report.candidats}`)
  console.log(`  jugées (texte verbatim dispo)  : ${report.evalues}`)
  console.log(`  ignorées (web, sans texte)     : ${report.ignoresSansTexte}`)
  console.log(`  drapeaux rouges                : ${report.drapeauxRouges}`)
  console.log(`  erreurs                        : ${report.erreurs}`)
  console.log('')
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
