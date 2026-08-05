/**
 * M13 / Data Hub — réconciliation post-run, exécutable (lot 5, spec §8.4).
 *
 * Appelé après chaque `meltano run` par `scripts/etl/run-nightly.sh`, avec le `since` du
 * run qui vient de se terminer. Source = Prisma, côté Guichet, dans CET environnement
 * (pas un appel HTTP à `/api/v1/export/counts` : ce script tourne déjà côté serveur, un
 * aller-retour réseau vers sa propre API n'apporterait rien).
 *
 * Entrepôt = PostgreSQL, sondé via `psqlEntrepot` (pas de dépendance `pg` ajoutée à
 * l'application pour un script d'exploitation ponctuel — voir la même logique que
 * `docker-compose.etl.yml`, aucun service permanent).
 *
 * Usage : DATABASE_URL=... WAREHOUSE_DATABASE_URL=postgresql://... \
 *         npx tsx scripts/datahub/reconcile.ts <since ISO>
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

import { prisma } from '../../src/lib/prisma'
import { allDescriptors } from '../../src/lib/datahub/descriptor'
import { reconcile, type CountSource, type WarehouseSource } from '../../src/lib/datahub/reconcile'
import { psqlEntrepot } from './psql-entrepot'

const prismaSource: CountSource = {
  async count(model, field, since) {
    const cle = model.charAt(0).toLowerCase() + model.slice(1)
    const delegate = (prisma as unknown as Record<string, { count(a: { where: Record<string, unknown> }): Promise<number> }>)[cle]
    return delegate.count({ where: { [field]: { gte: since } } })
  },
}

const psqlWarehouse: WarehouseSource = {
  async count(table, column, since) {
    const sql = `SELECT COUNT(*) FROM guichet_raw.${table} WHERE ${column} >= '${since.toISOString()}'`
    return Number(psqlEntrepot(sql).trim())
  },
}

async function main(): Promise<void> {
  const since = process.argv[2]
  if (!since || Number.isNaN(Date.parse(since))) {
    console.error('Usage : reconcile.ts <since ISO 8601>')
    process.exit(2)
  }

  const rows = await reconcile(allDescriptors(), new Date(since), prismaSource, psqlWarehouse)

  let echecs = 0
  for (const r of rows) {
    if (r.erreur) {
      console.log(`✗ ${r.stream} — comparaison impossible : ${r.erreur}`)
      echecs++
    } else if (r.ecart !== 0) {
      console.log(`✗ ${r.stream} — écart de ${r.ecart} (source ${r.source}, entrepôt ${r.entrepot})`)
      echecs++
    } else {
      console.log(`✓ ${r.stream} — ${r.source} lignes, concordant`)
    }
  }

  await prisma.$disconnect()

  if (echecs > 0) {
    console.error(`\n⛔ ${echecs}/${rows.length} flux en écart depuis ${since} — investiguer avant de considérer ce run fiable.`)
    process.exit(1)
  }
  console.log(`\n✅ ${rows.length}/${rows.length} flux concordants depuis ${since}.`)
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
