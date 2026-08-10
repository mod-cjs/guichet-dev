/**
 * Étape 0 — GUIC-704 · Seed du cluster Curation & Veille.
 *
 * Rend visibles tous les états que la refonte doit afficher :
 *   - items a_valider avec payloadExtrait RÉEL (type/région/organisation/deadline)
 *     → les signaux dérivés (✓ Type/Région/Organisation) ont de quoi s'afficher ;
 *   - un item au TITRE manquant (⚠ Titre manquant) ;
 *   - un item DOUBLON (statut doublon + doublonDeId) → ⚠ Doublon + « Fusionner » ;
 *   - scores de complétude variés (score élevé vs faible) ;
 *   - 3 sources de veille (dont une « officielle » gouv.sn) avec dernière collecte.
 *
 * Idempotent. Préserve les items déjà approuvés/rejetés. Usage : npx tsx scripts/seed-curation-admin.ts
 */
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL manquant')
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) })

const hAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000)

async function upsertSource(nom: string, srcUrl: string, frequence: 'quotidienne' | 'hebdomadaire', derniereVerifH: number) {
  const existant = await prisma.sourceVeille.findFirst({ where: { url: srcUrl }, select: { id: true } })
  const data = { nom, url: srcUrl, frequence, actif: true, derniereVerifLe: hAgo(derniereVerifH) }
  if (existant) {
    await prisma.sourceVeille.update({ where: { id: existant.id }, data })
    return existant.id
  }
  const cree = await prisma.sourceVeille.create({ data, select: { id: true } })
  return cree.id
}

async function main() {
  // 0) Alignement schéma LOCAL (dérive) : le stack (base 680) déclare encore le FK direct
  // `programme_id` (dev est passé aux tables de jonction OpportuniteProgramme, colonne droppée
  // par la migration 20260728210000). Sur la base locale « parité prod » la colonne manque →
  // TOUT `OpportuniteService.create` échoue (donc « → Modération » de la curation). On la
  // ré-ajoute (nullable) pour débloquer les tests locaux. À supprimer à la réconciliation dev.
  const col = (await prisma.$queryRawUnsafe("SHOW COLUMNS FROM opportunites LIKE 'programme_id'")) as unknown[]
  if (col.length === 0) {
    await prisma.$executeRawUnsafe('ALTER TABLE opportunites ADD COLUMN programme_id VARCHAR(36) NULL')
    console.log('↳ colonne locale programme_id ré-ajoutée (dérive schéma stack↔base)')
  }

  // 1) Sources diversifiées (dont une officielle gouv.sn)
  const sGouv = await upsertSource('DER/FJ (gouv.sn)', 'https://der.gouv.sn/appels', 'hebdomadaire', 5)
  const sEmploi = await upsertSource('Emploi.sn', 'https://demo.emploi.sn/flux', 'quotidienne', 2)
  const sLinkedin = await upsertSource('LinkedIn Jobs — Dakar', 'https://linkedin.com/jobs/dakar', 'quotidienne', 2)

  // Type d'opportunité réel (pour payload.typeId)
  const typeEmploi = await prisma.opportuniteType.findFirst({ where: { slug: 'emploi' }, select: { id: true } })
  const typeFormation = await prisma.opportuniteType.findFirst({ where: { slug: 'formation' }, select: { id: true } })

  // 2) Enrichir les items a_valider existants avec un payload réel + scores variés
  const items = await prisma.itemCuration.findMany({
    where: { statut: 'a_valider' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })

  const gabarits = [
    { titre: 'Développeur backend Node.js — Senstartup', organisation: 'Senstartup', region: 'Dakar', typeId: typeEmploi?.id, deadline: '2026-10-15', score: 88, sourceId: sEmploi },
    { titre: 'Programme national — métiers du numérique', organisation: 'État du Sénégal', region: 'National', typeId: typeFormation?.id, deadline: '2026-09-30', score: 94, sourceId: sGouv },
    { titre: 'Appel à projets — entrepreneuriat jeunes (DER/FJ)', organisation: 'DER/FJ', region: 'National', typeId: undefined, deadline: '2026-11-01', score: 71, sourceId: sGouv },
    { titre: null as string | null, organisation: 'Entreprise non précisée', region: 'Thies', typeId: typeEmploi?.id, deadline: undefined, score: 42, sourceId: sLinkedin }, // ⚠ titre manquant
    { titre: 'Chargé de communication digitale', organisation: 'Wave', region: 'Dakar', typeId: typeEmploi?.id, deadline: '2026-10-05', score: 76, sourceId: sLinkedin },
  ]

  let canonique1: string | null = null
  for (let i = 0; i < Math.min(items.length, gabarits.length); i++) {
    const g = gabarits[i]
    const payload: Record<string, unknown> = {
      titre: g.titre ?? undefined,
      organisation: g.organisation,
      region: g.region,
      deadline: g.deadline,
    }
    if (g.typeId) payload.typeId = g.typeId
    await prisma.itemCuration.update({
      where: { id: items[i].id },
      data: {
        titre: g.titre,
        scoreCompletude: g.score,
        sourceId: g.sourceId,
        payloadExtrait: payload as never,
        statut: 'a_valider',
        doublonDeId: null,
      },
    })
    if (i === 0) canonique1 = items[i].id
  }

  // 3) Un DOUBLON rattaché au premier item (⚠ Doublon détecté + « Fusionner »)
  if (canonique1 && items.length > gabarits.length) {
    await prisma.itemCuration.update({
      where: { id: items[gabarits.length].id },
      data: {
        titre: 'Développeur backend Node.js — Senstartup (repost)',
        scoreCompletude: 70,
        sourceId: sLinkedin,
        statut: 'doublon',
        doublonDeId: canonique1,
        payloadExtrait: { titre: 'Développeur backend Node.js', organisation: 'Senstartup', region: 'Dakar', typeId: typeEmploi?.id } as never,
      },
    })
  }

  const nb = await prisma.itemCuration.count({ where: { statut: 'a_valider' } })
  const nbDoublon = await prisma.itemCuration.count({ where: { statut: 'doublon' } })
  const nbSources = await prisma.sourceVeille.count({ where: { actif: true } })
  console.log(`✅ seed curation OK — ${nb} à valider · ${nbDoublon} doublon(s) · ${nbSources} sources actives`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('❌ seed curation:', e)
  await prisma.$disconnect()
  process.exit(1)
})
