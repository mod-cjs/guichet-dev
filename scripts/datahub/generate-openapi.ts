/**
 * M13 / Data Hub — écrit `docs/openapi/datahub-v1.yaml` depuis le contrat d'export.
 *
 * Le fichier est committé et une sentinelle de test échoue si sa régénération produit un
 * diff : c'est ce qui empêche la documentation publiée de dériver du code, comme l'avait
 * fait la version écrite à la main.
 *
 * Usage : npm run datahub:openapi
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildOpenApiDocument } from '../../src/lib/datahub/openapi'

const cible = join(process.cwd(), 'docs', 'openapi', 'datahub-v1.yaml')
writeFileSync(cible, buildOpenApiDocument())
console.log(`✅ ${cible} régénéré depuis le contrat d'export.`)
