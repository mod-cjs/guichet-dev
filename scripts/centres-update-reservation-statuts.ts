/**
 * Batch — bascule les réservations `Acceptee` dont la date est passée vers
 * `Passee`. À exécuter quotidiennement (MVP : manuel). GUIC-384 — Wave 5.
 *
 * Usage :
 *   npx tsx scripts/centres-update-reservation-statuts.ts
 *
 * Le check-in éventuel reste tracé via la table `check_ins` ; le passage
 * `Passee → NonHonoree` est un second batch (TODO Wave 6).
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result = await prisma.reservation.updateMany({
    where: {
      statut: 'Acceptee',
      dateReservee: { lt: today },
    },
    data: { statut: 'Passee' },
  })

  console.log(
    `[centres-update-reservation-statuts] ${result.count} réservation(s) Acceptee → Passee (cutoff ${today.toISOString()})`,
  )
}

main()
  .catch((e) => {
    console.error('[centres-update-reservation-statuts] échec', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
