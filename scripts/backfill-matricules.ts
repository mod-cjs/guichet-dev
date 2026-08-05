/**
 * GUIC-689 — Attribution d'un matricule aux comptes qui n'en ont pas.
 *
 * Le matricule est nullable : les 22 000 comptes migrés depuis Drupal n'en
 * avaient pas, et un compte sans matricule doit rester utilisable. Ce script
 * comble le retard, l'inscription se chargeant des nouveaux.
 *
 * L'année du matricule est celle de l'INSCRIPTION (`utilisateurs.created_at`),
 * pas celle de l'exécution : un membre de 2019 doit porter `GJ-2019-…`, sinon
 * le matricule ment sur son ancienneté.
 *
 * IDEMPOTENT : ne touche que les comptes à matricule nul. Rejouable.
 *
 * COLLISIONS : la série est tirée au sort sur 100 000 valeurs par année. Sur une
 * année chargée, une collision est probable (paradoxe des anniversaires) —
 * l'unicité est garantie par la base, et le script retente jusqu'à
 * `TENTATIVES_MAX` avant d'abandonner CE compte sans faire échouer les autres.
 *
 * Usage :
 *   npx tsx scripts/backfill-matricules.ts            # exécution
 *   npx tsx scripts/backfill-matricules.ts --dry-run  # simulation
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

const TENTATIVES_MAX = 12

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const { prisma } = await import('../src/lib/prisma')
  const { genererMatricule } = await import('../src/lib/membre/matricule')

  const sansMatricule = await prisma.utilisateur.findMany({
    where: { matricule: null },
    select: { cjsUid: true, createdAt: true },
  })

  let attribues = 0
  const echecs: string[] = []

  for (const u of sansMatricule) {
    let pose = false
    for (let essai = 0; essai < TENTATIVES_MAX && !pose; essai++) {
      const matricule = genererMatricule(u.createdAt)
      if (dryRun) {
        // En simulation on ne peut pas éprouver l'unicité réelle ; on se
        // contente de vérifier qu'aucun compte ne la porte déjà.
        const pris = await prisma.utilisateur.findUnique({ where: { matricule }, select: { cjsUid: true } })
        if (!pris) pose = true
        continue
      }
      try {
        await prisma.utilisateur.update({ where: { cjsUid: u.cjsUid }, data: { matricule } })
        pose = true
      } catch {
        // Violation d'unicité : on retire un nouveau numéro pour ce compte.
      }
    }
    if (pose) attribues++
    else echecs.push(u.cjsUid)
  }

  console.log(`comptes sans matricule : ${sansMatricule.length}`)
  console.log(`${dryRun ? 'à attribuer' : 'attribués'}            : ${attribues}`)
  if (echecs.length > 0) {
    console.log(`ÉCHECS (${TENTATIVES_MAX} collisions d'affilée) : ${echecs.length}`)
    for (const c of echecs.slice(0, 10)) console.log(`  ${c}`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
