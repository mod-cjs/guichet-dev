/**
 * Reprojection Prisma → Neo4j (GUIC-259, Lot 1) vers une base CIBLE.
 *
 * Outil d'ops/validation : rejoue `reprojectAll()` (le filet nocturne) en ligne de
 * commande. Par défaut vise la base `enriched` — celle que l'app interroge
 * (`NEO4J_DATABASE=enriched` en local comme dans docker-compose). Ainsi
 * `npm run yaye:reproject` reconstruit exactement le graphe que lit Yaye, avec
 * le projecteur TypeScript du Lot 1 (et non l'ancienne projection POC Python).
 *
 * Usage :
 *   npx tsx scripts/yaye-graph-reproject.ts                  # → base enriched, wipe
 *   npx tsx scripts/yaye-graph-reproject.ts --db standard    # autre cible explicite
 *   npx tsx scripts/yaye-graph-reproject.ts --no-wipe        # merge sans purge
 *
 * Charge `.env.local` (DATABASE_URL source + NEO4J_*). Source = la base MariaDB
 * pointée par DATABASE_URL (= yaye_poc_enriched) ; cible = `--db` (sinon enriched).
 * NB : nom de base Neo4j sans underscore (contrainte Neo4j 5).
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

const args = process.argv.slice(2)
const dbIdx = args.indexOf('--db')
const targetDb = dbIdx >= 0 ? args[dbIdx + 1] : 'enriched'
const wipe = !args.includes('--no-wipe')

// Doit être posé AVANT l'import des modules qui lisent neo4jDatabase().
process.env.NEO4J_DATABASE = targetDb

async function main(): Promise<void> {
  const { getNeo4jDriver } = await import('../src/lib/neo4j')
  const { reprojectAll } = await import('../src/lib/ia/graph/projection/project')
  const driver = getNeo4jDriver()

  // Crée la base cible si absente (Neo4j Enterprise multi-db) + attend l'état online.
  const sys = driver.session({ database: 'system' })
  try {
    await sys.run(`CREATE DATABASE \`${targetDb}\` IF NOT EXISTS`)
    for (let i = 0; i < 40; i++) {
      const r = await sys.run(`SHOW DATABASE \`${targetDb}\` YIELD currentStatus`)
      if (r.records[0]?.get('currentStatus') === 'online') break
      await new Promise(res => setTimeout(res, 500))
    }
  } finally {
    await sys.close()
  }

  const source = process.env.DATABASE_URL?.split('@')[1] ?? '?'
  console.log(`→ Reprojection vers Neo4j db "${targetDb}" (wipe=${wipe}) depuis MariaDB ${source}`)
  const t0 = Date.now()
  const report = await reprojectAll({ wipe })
  console.log(`✅ terminé en ${Date.now() - t0} ms`)
  console.log(JSON.stringify(report, null, 2))
  await driver.close()
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ reprojection échouée:', err)
    process.exit(1)
  })
