/**
 * M13 / Data Hub — applique `scripts/sql/repair-donnees-poc.sql` via la connexion Prisma déjà
 * établie (GUIC-700).
 *
 * POURQUOI PAS UN CLIENT mariadb EN LIGNE DE COMMANDE
 * L'image de déploiement (stage `runner`, slim) n'a pas de client MariaDB, et parser
 * `DATABASE_URL` à la main pour un client externe rejoue le piège des guillemets non
 * retirés par `docker run --env-file` (contrairement à `docker compose`, qui gère
 * `env_file` correctement — c'est ce que `src/lib/prisma.ts` utilise déjà, prouvé
 * fonctionnel par `preflight.ts`). Ce script réutilise donc la même connexion.
 *
 * Rejouable sans effet de bord (chaque instruction du fichier ne touche que les lignes
 * fautives, voir l'en-tête de `repair-donnees-poc.sql`).
 *
 * Usage :
 *   npx tsx scripts/sql/apply-repair.ts --dry-run   # affiche le SQL sans rien appliquer
 *   npx tsx scripts/sql/apply-repair.ts             # applique
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

config({ path: '.env.local' })

import { prisma } from '../../src/lib/prisma'

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')

  const brut = readFileSync(join(process.cwd(), 'scripts', 'sql', 'repair-donnees-poc.sql'), 'utf8')
  const statements = brut
    .split('\n')
    .filter((ligne) => !ligne.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  if (dryRun) {
    console.log(`\n-- ${statements.length} statement(s) — dry run, rien n'est appliqué\n`)
    for (const s of statements) console.log(`${s};\n`)
    await prisma.$disconnect()
    return
  }

  for (const statement of statements) {
    const n = await prisma.$executeRawUnsafe(statement)
    console.log(`✓ ${n} ligne(s) affectée(s) — ${statement.split('\n')[0].slice(0, 60)}…`)
  }
  console.log(`\n✅ ${statements.length} instruction(s) appliquée(s).`)
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
