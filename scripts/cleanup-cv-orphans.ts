/**
 * GUIC-231 — CLI de cleanup des CV orphelins sur Vercel Blob.
 *
 * Usage :
 *   npx tsx scripts/cleanup-cv-orphans.ts            # dry-run (défaut)
 *   npx tsx scripts/cleanup-cv-orphans.ts --apply    # supprime réellement
 *
 * Env vars : BLOB_READ_WRITE_TOKEN, DATABASE_URL
 */

import { cleanupCvOrphans } from '../src/lib/cleanup-cv-orphans'

async function main() {
  const apply = process.argv.includes('--apply')

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Erreur : BLOB_READ_WRITE_TOKEN manquant dans l\'environnement.')
    process.exit(1)
  }
  if (!process.env.DATABASE_URL) {
    console.error('Erreur : DATABASE_URL manquant dans l\'environnement.')
    process.exit(1)
  }

  console.log(`[cleanup-cv-orphans] mode=${apply ? 'apply' : 'dry-run'}`)

  const result = await cleanupCvOrphans({ apply })

  console.log(JSON.stringify(result, null, 2))

  if (!apply && result.orphans > 0) {
    console.log(
      `\n→ ${result.orphans} orphelin(s) détecté(s). Relancer avec --apply pour supprimer.`,
    )
  }
}

main()
  .catch((err) => {
    console.error('cleanup-cv-orphans failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    // Évite que le process reste suspendu sur la connexion Prisma.
    const { prisma } = await import('../src/lib/prisma')
    await prisma.$disconnect()
  })
