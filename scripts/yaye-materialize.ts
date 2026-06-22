/**
 * Matérialise toutes les métriques Yaye par session dans yaye_session_summaries
 * (GUIC-435). Usage : npx tsx scripts/yaye-materialize.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

import { prisma } from '@/lib/prisma'
import { materializeSummaries } from '@/lib/ia/metrics/materialize'

async function main() {
  const report = await materializeSummaries({})
  console.log('\n=== Matérialisation des métriques par session ===')
  console.log(`  sessions vues  : ${report.sessions}`)
  console.log(`  résumés écrits : ${report.ecrits}`)
  console.log(`  drapeaux rouges: ${report.drapeauxRouges}`)
  console.log('')
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
