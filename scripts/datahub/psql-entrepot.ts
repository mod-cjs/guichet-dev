/**
 * M13 / Data Hub — sonde `psql` de l'entrepôt, via un conteneur `postgres:16-alpine --rm`
 * jetable (GUIC-700).
 *
 * Centralisé pour `reconcile.ts` ET `purge-absents.ts` — dupliquer l'invocation aurait
 * laissé le même correctif à faire deux fois (trouvé au premier run réel en préprod :
 * aucun des deux ne joignait `cjs-net`, alors que l'entrepôt (`cjs_analytics_postgres`)
 * est un nom de conteneur sur ce réseau, pas un domaine résoluble sur le réseau par
 * défaut d'un `docker run` isolé — même piège déjà corrigé pour `meltano` dans
 * `docker-compose.etl.yml`).
 */
import { execFileSync } from 'node:child_process'

export function psqlEntrepot(sql: string): string {
  const uri = process.env.WAREHOUSE_DATABASE_URL
  if (!uri) throw new Error('WAREHOUSE_DATABASE_URL absente — sonde entrepôt impossible')

  const reseau = process.env.SERVICES_NETWORK ?? 'cjs-net'
  return execFileSync(
    'docker',
    ['run', '--rm', '-i', '--network', reseau, 'postgres:16-alpine', 'psql', uri, '-tAc', sql],
    { encoding: 'utf8' }
  )
}
