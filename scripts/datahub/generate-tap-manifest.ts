/**
 * M13 / Data Hub — écrit le manifeste lu par le tap Singer au démarrage.
 *
 * Le fichier est committé et une sentinelle échoue si sa régénération produit un diff :
 * c'est ce qui empêche le catalogue publié au Data Hub de dériver du contrat.
 *
 * Usage : npm run datahub:tap
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderTapManifest } from '../../src/lib/datahub/tap-manifest'

const cible = join(
  process.cwd(),
  'etl', 'plugins', 'extractors', 'tap-guichet', 'tap_guichet', 'streams.json'
)
writeFileSync(cible, renderTapManifest())
console.log(`✅ ${cible} régénéré depuis le contrat d'export.`)
