/**
 * GUIC-704 — Sources de veille RÉELLES (collecte opérationnelle, pas de démo).
 *
 * Enregistre des sources publiques réellement crawlables par le robot (RSS/HTML on-domain,
 * pages avec og:title exploitable) et DÉSACTIVE les sources démo non-crawlables du seed UI
 * (`seed-curation-admin.ts`) qui ne faisaient qu'errer à chaque collecte.
 *
 * Vérifié en réel (2026-08-10) : `concoursn.com/feed/` → 10 liens on-domain, extraction
 * score ~67 (titre/description/deadline/organisation), items `a_valider` publiables.
 *
 * Idempotent. Usage : npx tsx scripts/seed-sources-reelles.ts
 */
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL manquant')
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) })

/** Sources réelles à activer. `typeDefautSlug` garantit un type (les pages n'ont pas de @type schema.org). */
const SOURCES_REELLES = [
  {
    nom: 'ConcoursN — concours & recrutements (SN)',
    url: 'https://www.concoursn.com/feed/',
    methode: 'auto' as const,
    frequence: 'quotidienne' as const,
    typeDefautSlug: 'emploi',
  },
]

/** Domaines démo non-crawlables posés par seed-curation-admin.ts → à désactiver en opération réelle. */
const DEMO_URLS = ['https://der.gouv.sn/appels', 'https://demo.emploi.sn/flux', 'https://linkedin.com/jobs/dakar']

async function main() {
  for (const s of SOURCES_REELLES) {
    const type = await prisma.opportuniteType.findFirst({ where: { slug: s.typeDefautSlug, actif: true }, select: { id: true } })
    if (!type) {
      console.warn(`⚠ type « ${s.typeDefautSlug} » introuvable — source « ${s.nom} » ignorée`)
      continue
    }
    const data = {
      nom: s.nom,
      url: s.url,
      methode: s.methode,
      frequence: s.frequence,
      actif: true,
      typeDefautId: type.id,
      prochaineVerifLe: new Date(0), // « due » immédiatement → collectée au prochain run/cron
    }
    const existant = await prisma.sourceVeille.findFirst({ where: { url: s.url }, select: { id: true } })
    if (existant) await prisma.sourceVeille.update({ where: { id: existant.id }, data })
    else await prisma.sourceVeille.create({ data })
    console.log(`✓ source réelle active : ${s.nom}`)
  }

  const dez = await prisma.sourceVeille.updateMany({ where: { url: { in: DEMO_URLS }, actif: true }, data: { actif: false } })
  if (dez.count) console.log(`↳ ${dez.count} source(s) démo désactivée(s) (non-crawlables)`)

  const actives = await prisma.sourceVeille.count({ where: { actif: true, deletedAt: null } })
  console.log(`✅ ${actives} source(s) active(s). Collecte : bouton « Lancer la collecte » (admin) ou cron horaire /api/cron/veille-sources.`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('❌ seed sources réelles:', e)
  await prisma.$disconnect()
  process.exit(1)
})
