/**
 * Mesure de latence des templates du Knowledge Graph (GUIC-259, Lot 1 — ops).
 *
 * Exécute chaque traversée via le vrai `Neo4jGraphAdapter` sur la base cible
 * (défaut `enriched`), avec quelques tours de chauffe puis N tours mesurés, et
 * reporte médiane / p95 / max. Sert à valider que les templates whitelistés
 * tiennent le budget de latence (R3) sur des données réalistes.
 *
 * Usage :
 *   npx tsx scripts/yaye-graph-latency.ts --uid <cjsUid> --opp <opportuniteId>
 *   npx tsx scripts/yaye-graph-latency.ts                 # échantillonne des ids
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

const args = process.argv.slice(2)
const arg = (k: string) => {
  const i = args.indexOf(k)
  return i >= 0 ? args[i + 1] : undefined
}
const targetDb = arg('--db') ?? 'enriched'
const RUNS = Number(arg('--runs') ?? 20)
const WARMUP = 3

process.env.NEO4J_DATABASE = targetDb

function stats(ms: number[]): { median: number; p95: number; max: number } {
  const s = [...ms].sort((a, b) => a - b)
  const at = (q: number) => s[Math.min(s.length - 1, Math.floor(q * s.length))]
  return { median: at(0.5), p95: at(0.95), max: s[s.length - 1] }
}

async function bench(label: string, fn: () => Promise<{ length: number } | { manquantes: unknown[] }>): Promise<void> {
  for (let i = 0; i < WARMUP; i++) await fn()
  const times: number[] = []
  let lastCount = 0
  for (let i = 0; i < RUNS; i++) {
    const t0 = Date.now()
    const r = await fn()
    times.push(Date.now() - t0)
    lastCount = 'length' in r ? r.length : r.manquantes.length
  }
  const { median, p95, max } = stats(times)
  console.log(
    `${label.padEnd(22)} médiane ${String(median).padStart(4)}ms · p95 ${String(p95).padStart(4)}ms · max ${String(max).padStart(4)}ms · résultats ${lastCount}`,
  )
}

async function main(): Promise<void> {
  const { getNeo4jDriver } = await import('../src/lib/neo4j')
  const { Neo4jGraphAdapter } = await import('../src/lib/ia/graph/neo4j-adapter')
  const driver = getNeo4jDriver()
  const a = new Neo4jGraphAdapter()

  // Échantillonne un bénéficiaire (avec candidatures) et une opportunité (avec REQUIERT).
  const sess = driver.session({ database: targetDb })
  let uid = arg('--uid')
  let oppId = arg('--opp')
  try {
    if (!uid) {
      const r = await sess.run('MATCH (b:Beneficiaire)-[:A_POSTULE]->() RETURN b.cjsUid AS uid LIMIT 1')
      uid = r.records[0]?.get('uid') as string
    }
    if (!oppId) {
      const r = await sess.run('MATCH (o:Opportunite)-[:REQUIERT]->() RETURN o.id AS id LIMIT 1')
      oppId = r.records[0]?.get('id') as string
    }
  } finally {
    await sess.close()
  }

  console.log(`Latence templates KG — db "${targetDb}", ${RUNS} tours (uid=${uid?.slice(0, 8)}…, opp=${oppId?.slice(0, 8)}…)\n`)
  const scope = { cjsUid: uid!, roles: ['beneficiaire'], centreId: null }

  await bench('searchOpportunites', () => a.searchOpportunites({ domaine: 'Numerique', limit: 5 }))
  await bench('skillGap', () => a.skillGap(scope, oppId!).then(r => ({ manquantes: r.manquantes })))
  await bench('eligibleOpportunites', () => a.eligibleOpportunites(scope, 5))
  await bench('collaborativeReco', () => a.collaborativeReco(scope, 5))
  await bench('multiEntityPath', () => a.multiEntityPath({ limit: 5 }))

  await driver.close()
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ mesure échouée:', err)
    process.exit(1)
  })
