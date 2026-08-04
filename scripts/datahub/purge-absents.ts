/**
 * M13 / Data Hub — propagation des suppressions dures, exécutable (lot 7, spec §8.5).
 *
 * Appelé hebdomadairement (crontab séparée de `run-nightly.sh` — cadence différente,
 * pas de dépendance à un run réussi). Source = Prisma, côté Guichet, dans CET
 * environnement (pas un appel HTTP à une route publique : ce script tourne déjà côté
 * serveur, et exposer un paramètre `?fields=id` sur l'API publique pour un usage
 * strictement interne ajouterait une surface à sécuriser sans bénéfice).
 *
 * Entrepôt = PostgreSQL, sondé via un conteneur `postgres:16-alpine --rm` (même choix
 * que `reconcile.ts` — pas de dépendance `pg` ajoutée à l'application pour un script
 * d'exploitation ponctuel).
 *
 * Usage : DATABASE_URL=... WAREHOUSE_DATABASE_URL=postgresql://... \
 *         npx tsx scripts/datahub/purge-absents.ts
 */
import { execFileSync } from 'node:child_process'
import { config } from 'dotenv'

config({ path: '.env.local' })

import { prisma } from '../../src/lib/prisma'
import { allDescriptors } from '../../src/lib/datahub/descriptor'
import { purgeAbsents, type KeySource, type WarehouseKeys } from '../../src/lib/datahub/purge-absents'

const prismaSource: KeySource = {
  async keys(model, field) {
    const cle = model.charAt(0).toLowerCase() + model.slice(1)
    const delegate = (prisma as unknown as Record<string, { findMany(a: { select: Record<string, true> }): Promise<Record<string, unknown>[]> }>)[cle]
    const rows = await delegate.findMany({ select: { [field]: true } })
    return rows.map((r) => String(r[field]))
  },
}

/** `psql` via un conteneur jetable — pas de client PostgreSQL installé sur l'hôte. */
function psql(sql: string): string {
  const uri = process.env.WAREHOUSE_DATABASE_URL
  if (!uri) throw new Error('WAREHOUSE_DATABASE_URL absente — sonde entrepôt impossible')
  return execFileSync(
    'docker',
    ['run', '--rm', '-i', 'postgres:16-alpine', 'psql', uri, '-tAc', sql],
    { encoding: 'utf8' }
  )
}

const psqlWarehouse: WarehouseKeys = {
  async keys(table, column) {
    const sortie = psql(`SELECT ${column} FROM guichet_raw.${table}`)
    return sortie.split('\n').map((l) => l.trim()).filter(Boolean)
  },
  async deleteMany(table, column, absentes) {
    if (absentes.length === 0) return 0
    // Chaque valeur est échappée (guillemets simples doublés) : les clés primaires du
    // Guichet sont des UUID ou des identifiants numériques, jamais du texte libre, mais
    // le principe reste — ne jamais interpoler une valeur externe sans échappement.
    const liste = absentes.map((v) => `'${v.replace(/'/g, "''")}'`).join(',')
    const sortie = psql(
      `DELETE FROM guichet_raw.${table} WHERE ${column} IN (${liste}); SELECT ${absentes.length}`
    )
    return Number(sortie.trim().split('\n').pop())
  },
}

async function main(): Promise<void> {
  const rows = await purgeAbsents(allDescriptors(), prismaSource, psqlWarehouse)

  let echecs = 0
  let totalSupprimees = 0
  for (const r of rows) {
    if (r.erreur) {
      console.log(`✗ ${r.stream} — comparaison impossible : ${r.erreur}`)
      echecs++
    } else if (r.supprimees && r.supprimees > 0) {
      console.log(`⚠ ${r.stream} — ${r.supprimees} ligne(s) supprimée(s) (absentes côté source)`)
      totalSupprimees += r.supprimees
    } else {
      console.log(`✓ ${r.stream} — aucune absence`)
    }
  }

  await prisma.$disconnect()

  if (echecs > 0) {
    console.error(`\n⛔ ${echecs}/${rows.length} flux en échec de comparaison — investiguer avant le prochain passage.`)
    process.exit(1)
  }
  console.log(`\n✅ ${rows.length} flux comparés, ${totalSupprimees} ligne(s) supprimée(s) au total.`)
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
