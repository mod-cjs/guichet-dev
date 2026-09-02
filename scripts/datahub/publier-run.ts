/**
 * M13 / Data Hub — publication du résultat d'un run vers le Guichet (fraîcheur du pipeline).
 *
 * POURQUOI CE SCRIPT
 * L'état des runs ne vivait que dans `DATAHUB_LOG_FILE`, sur l'hôte ETL : un administrateur
 * devant un tableau de bord n'avait aucun moyen de savoir si les chiffres dataient de la
 * nuit ou de la semaine dernière. Ce script écrit ce résultat dans la base du Guichet, d'où
 * `/admin/data-hub` le lit.
 *
 * SENS DE CIRCULATION — le pipeline POUSSE, le Guichet ne tire jamais. L'inverse forcerait
 * l'application à joindre l'entrepôt PostgreSQL, alors que GUIC-700 sépare délibérément les
 * deux (aucun réseau Docker partagé entre l'app et l'entrepôt).
 *
 * PAS D'ENDPOINT HTTP — appelé par `exec_via_app`, exactement comme `reconcile.ts` : le
 * script tourne DANS le conteneur `app`, avec son `DATABASE_URL`. Un endpoint public
 * demanderait un secret HMAC de plus à distribuer et à faire tourner, pour joindre une
 * base que ce processus atteint déjà.
 *
 * Usage : npx tsx scripts/datahub/publier-run.ts <statut> <étape> <demarreA ISO> [message…]
 *   statut : succes | echec
 *   étape  : extraction | dbt | reconciliation | complet
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

import { prisma } from '../../src/lib/prisma'
import { lirePublication } from '../../src/lib/datahub/fraicheur'

async function main(): Promise<void> {
  const publication = lirePublication(process.argv.slice(2))

  await prisma.datahubRun.create({
    data: {
      demarreA: publication.demarreA,
      statut: publication.statut,
      etape: publication.etape,
      message: publication.message,
    },
  })

  console.log(
    `✓ run publié : ${publication.statut} à l'étape ${publication.etape} (démarré ${publication.demarreA.toISOString()})`,
  )
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e)
  await prisma.$disconnect()
  // Code 2 et non 1 : `run-nightly.sh` doit pouvoir distinguer « le pipeline a échoué » de
  // « le pipeline a réussi mais la publication de son statut a échoué ». Confondre les deux
  // ferait passer un run vert pour rouge.
  process.exit(2)
})
