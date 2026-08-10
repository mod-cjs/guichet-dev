/**
 * Amorçage des données de RÉFÉRENCE — GUIC-674.
 *
 * À ne pas confondre avec `prisma/seed/index.ts`, le seed de DÉVELOPPEMENT :
 * celui-ci injecte opportunités, centres, ressources, notifications — des
 * fixtures, utiles à la main, mais qui fausseraient les tests d'intégration en
 * ajoutant des lignes que les suites comptent.
 *
 * Ici, uniquement ce sans quoi l'application ne fonctionne pas : les quatre
 * programmes sectoriels du CJS. Depuis GUIC-684, tout rattachement est
 * obligatoire — créer une ressource ou une opportunité sans eux lève
 * `PROGRAMME_INCONNU`. C'est de la donnée métier, au même titre qu'une liste de
 * régions, pas un échafaudage de test.
 *
 * Idempotent (upsert sur le slug) : rejouable sans effet de bord.
 *
 * Utilisé par la CI entre `prisma migrate deploy` et `npm run test`, et
 * utilisable à la main sur toute base fraîche :
 *
 *   npx tsx prisma/seed/reference.ts
 */
import { prisma } from '../../src/lib/prisma'

import { seedOpportuniteTypes } from './opportunite-types'
import { seedProgrammes } from './programmes'

async function main() {
  const programmes = await seedProgrammes(prisma)
  const types = await seedOpportuniteTypes(prisma)
  console.log(`✅ Données de référence : ${programmes} programmes, ${types} types d’opportunité`)
}

main()
  .catch((e) => {
    console.error('❌ Amorçage des données de référence :', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
