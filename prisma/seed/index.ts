import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seed — aucune donnée à insérer pour l\'instant.')
  console.log('Les modèles seront définis lors de la phase de modélisation.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
