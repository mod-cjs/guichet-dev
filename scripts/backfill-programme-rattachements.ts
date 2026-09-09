/**
 * GUIC-684 — Backfill des rattachements aux programmes (colonne dépréciée → jonction M:N).
 *
 * Recopie `opportunites.programme_id` (rattachement 1:N historique) dans la table
 * `opportunites_programmes`, avec `principal = true` : une opportunité qui n'avait
 * qu'un programme garde ce programme comme principal.
 *
 * IDEMPOTENT : `skipDuplicates` sur la PK composite → rejouable sans effet de bord.
 * Ne touche PAS aux opportunités déjà rattachées via la jonction (une exécution
 * tardive ne peut pas écraser un rattachement saisi entre-temps par un admin).
 *
 * Usage :
 *   npx tsx scripts/backfill-programme-rattachements.ts            # exécution
 *   npx tsx scripts/backfill-programme-rattachements.ts --dry-run  # simulation
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const { prisma } = await import('../src/lib/prisma')

  // Candidates : colonne dépréciée renseignée ET aucune ligne de jonction existante.
  const candidates = await prisma.opportunite.findMany({
    where: { programmeId: { not: null }, programmes: { none: {} } },
    select: { id: true, programmeId: true },
  })

  const dejaRattachees = await prisma.opportuniteProgramme.count()
  const total = await prisma.opportunite.count({ where: { deletedAt: null } })

  console.log(`Opportunités (actives)             : ${total}`)
  console.log(`Rattachements déjà en jonction      : ${dejaRattachees}`)
  console.log(`À backfiller depuis programme_id    : ${candidates.length}`)

  if (candidates.length === 0) {
    console.log('✅ Rien à faire — aucune opportunité ne porte de rattachement hérité.')
  } else if (dryRun) {
    console.log('(--dry-run : aucune écriture)')
  } else {
    const res = await prisma.opportuniteProgramme.createMany({
      data: candidates.map((o) => ({
        opportuniteId: o.id,
        programmeId: o.programmeId as string,
        principal: true,
      })),
      skipDuplicates: true,
    })
    console.log(`✅ ${res.count} rattachement(s) créé(s), tous marqués principal.`)
  }

  // Contrôle final : aucune opportunité active ne doit rester sans programme une fois
  // le backfill passé ET l'admin repassé sur le stock (cf. reprise du stock, lot admin).
  const orphelines = await prisma.opportunite.count({
    where: { deletedAt: null, programmes: { none: {} } },
  })
  if (orphelines > 0) {
    console.log(
      `⚠️  ${orphelines} opportunité(s) active(s) sans aucun programme — ` +
        'à traiter via le rattachement en masse de l\'admin.',
    )
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
