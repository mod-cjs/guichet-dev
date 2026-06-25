/**
 * Seed de démonstration — Check-ins d'accès aux centres (QR carte CJS vs manuel).
 *
 * Alimente les analytics admin `/admin/analytics/centres` (ventilation « Accès par QR »
 * + tendance journalière). Répartit ~48 check-ins sur les 14 derniers jours, ~70 % via
 * QR de la carte, ~30 % saisis manuellement, sur les 4 premiers centres.
 *
 * Idempotent : purge puis recrée les check-ins marqués (`jwtNonce` préfixé `seed-qr-`).
 *
 * Usage : npx tsx scripts/seed-checkins-qr.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

const MARKER = 'seed-qr-'
const JOURS = 14
const PAR_JOUR = 3 // ~3 accès/jour/échantillon

async function main(): Promise<void> {
  const { prisma } = await import('../src/lib/prisma')

  const [centres, users] = await Promise.all([
    prisma.centre.findMany({ select: { id: true, nom: true }, orderBy: { nom: 'asc' }, take: 4 }),
    prisma.utilisateur.findMany({ where: { deletedAt: null }, select: { cjsUid: true }, take: 6 }),
  ])
  if (centres.length === 0 || users.length === 0) {
    throw new Error('Centres ou utilisateurs absents — impossible de seeder des check-ins.')
  }

  // Purge des check-ins de démo précédents (re-run idempotent).
  await prisma.checkIn.deleteMany({ where: { jwtNonce: { startsWith: MARKER } } })

  const rows: Array<{
    cjsUid: string
    centreId: string
    via: 'QrCard' | 'Manuel'
    effectueA: Date
    jwtNonce: string
    conseillerEmail: string | null
  }> = []

  let n = 0
  const now = new Date()
  for (let d = 0; d < JOURS; d++) {
    const jour = new Date(now)
    jour.setDate(jour.getDate() - d)
    for (let k = 0; k < PAR_JOUR; k++) {
      const idx = d * PAR_JOUR + k
      // ~70 % QR, ~30 % manuel (motif déterministe pour la reproductibilité).
      const via = idx % 10 < 7 ? 'QrCard' : 'Manuel'
      const effectueA = new Date(jour)
      effectueA.setHours(9 + (k % 8), (idx * 7) % 60, 0, 0)
      rows.push({
        cjsUid: users[idx % users.length].cjsUid,
        centreId: centres[idx % centres.length].id,
        via,
        effectueA,
        jwtNonce: `${MARKER}${idx}`,
        conseillerEmail: via === 'Manuel' ? 'accueil.demo@cjs.local' : null,
      })
      n++
    }
  }

  await prisma.checkIn.createMany({ data: rows })

  const qr = rows.filter((r) => r.via === 'QrCard').length
  console.log(`✅ Seed check-ins : ${n} créés (${qr} QR / ${n - qr} manuels) sur ${JOURS} jours, ${centres.length} centres.`)
  console.log(`   Centres : ${centres.map((c) => c.nom).join(', ')}`)
  await prisma.$disconnect()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ seed check-ins échoué:', err)
    process.exit(1)
  })
