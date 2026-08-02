/**
 * M13 / Data Hub — écrit les sources dbt depuis le contrat d'export.
 * Usage : npm run datahub:dbt
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildDbtSources } from '../../src/lib/datahub/dbt-sources'

const cible = join(process.cwd(), 'etl', 'transform', 'models', 'sources.yml')
writeFileSync(cible, buildDbtSources())
console.log(`✅ ${cible} régénéré depuis le contrat d'export.`)
