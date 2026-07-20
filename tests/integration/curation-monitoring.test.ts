/**
 * @jest-environment node
 *
 * GUIC-602 — US-7 : stats & alertes de monitoring. INTÉGRATION RÉELLE MariaDB.
 */
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { statsParSource, resumeCuration } from '@/lib/curation/monitoring/stats'

jest.setTimeout(30000)

const PREFIX = 'test-guic602'
const RUN = Date.now()

async function source(over: Record<string, unknown> = {}) {
  return prisma.sourceVeille.create({
    data: {
      nom: `${PREFIX} src ${Math.random().toString(36).slice(2, 8)}`,
      url: `https://veille-${RUN}-${Math.random().toString(36).slice(2, 8)}.sn/l`,
      methode: 'rss',
      frequence: 'quotidienne',
      // NON due (verif dans le futur) : un executerVeille global d'un autre fichier de test
      // tournant en parallèle ne doit pas ramasser ces sources (isolation).
      prochaineVerifLe: new Date(Date.now() + 3600_000),
      ...over,
    },
  })
}

async function exec(sourceId: string, statut: 'ok' | 'partiel' | 'erreur', nbLiens: number, createdAt: Date) {
  return prisma.executionVeille.create({
    data: { sourceId, demarreLe: createdAt, dureeMs: 100, nbLiensDecouverts: nbLiens, nbNouveautes: nbLiens, nbErreurs: statut === 'erreur' ? 1 : 0, statut, createdAt },
  })
}

async function item(sourceId: string, statut: 'a_valider' | 'approuvee' | 'rejetee' | 'en_attente') {
  const url = `https://veille-${RUN}.sn/o/${Math.random().toString(36).slice(2, 10)}`
  return prisma.itemCuration.create({
    data: { sourceId, urlCanonique: url, empreinte: createHash('sha256').update(url).digest('hex'), titre: 'x', statut },
  })
}

async function purge() {
  await prisma.itemCuration.deleteMany({ where: { source: { nom: { startsWith: PREFIX } } } })
  await prisma.executionVeille.deleteMany({ where: { source: { nom: { startsWith: PREFIX } } } })
  await prisma.sourceVeille.deleteMany({ where: { nom: { startsWith: PREFIX } } })
}
beforeAll(purge)
afterEach(purge)
afterAll(async () => {
  await prisma.$disconnect()
})

const t = (minAgo: number) => new Date(Date.now() - minAgo * 60_000)

describe('GUIC-602 — statsParSource', () => {
  it('calcule les taux d’approbation/rejet et le nb rapporté', async () => {
    const s = await source()
    await item(s.id, 'approuvee')
    await item(s.id, 'approuvee')
    await item(s.id, 'approuvee')
    await item(s.id, 'rejetee')
    await item(s.id, 'a_valider')

    const stats = await statsParSource()
    const st = stats.find((x) => x.sourceId === s.id)
    expect(st?.nbRapportees).toBe(5)
    // 3 approuvées / (3 approuvées + 1 rejetée) = 75%
    expect(st?.tauxApprobation).toBe(75)
    expect(st?.tauxRejet).toBe(25)
    expect(st?.alerte).toBeNull()
  })

  it('ALERTE erreur répétée : 3 derniers runs en erreur', async () => {
    const s = await source()
    await exec(s.id, 'ok', 5, t(40))
    await exec(s.id, 'erreur', 0, t(30))
    await exec(s.id, 'erreur', 0, t(20))
    await exec(s.id, 'erreur', 0, t(10))
    const st = (await statsParSource()).find((x) => x.sourceId === s.id)
    expect(st?.alerte).toBe('erreur_repetee')
    expect(st?.nbErreursRecentes).toBe(3)
  })

  it('ALERTE chute à zéro : produisait avant, 3 derniers runs à 0 lien', async () => {
    const s = await source()
    await exec(s.id, 'ok', 12, t(50)) // produisait
    await exec(s.id, 'partiel', 0, t(30))
    await exec(s.id, 'partiel', 0, t(20))
    await exec(s.id, 'partiel', 0, t(10))
    const st = (await statsParSource()).find((x) => x.sourceId === s.id)
    expect(st?.alerte).toBe('chute_zero')
  })

  it('source saine (runs OK avec liens) → aucune alerte', async () => {
    const s = await source()
    await exec(s.id, 'ok', 8, t(30))
    await exec(s.id, 'ok', 5, t(20))
    await exec(s.id, 'ok', 6, t(10))
    const st = (await statsParSource()).find((x) => x.sourceId === s.id)
    expect(st?.alerte).toBeNull()
  })

  it('source jamais productive (toujours 0) → PAS chute_zero (pas de baseline)', async () => {
    const s = await source()
    await exec(s.id, 'partiel', 0, t(30))
    await exec(s.id, 'partiel', 0, t(20))
    await exec(s.id, 'partiel', 0, t(10))
    const st = (await statsParSource()).find((x) => x.sourceId === s.id)
    expect(st?.alerte).toBeNull() // n'a jamais produit → pas une "chute"
  })

  it('moins de 3 exécutions → aucune alerte (fenêtre incomplète)', async () => {
    const s = await source()
    await exec(s.id, 'erreur', 0, t(20))
    await exec(s.id, 'erreur', 0, t(10)) // 2 erreurs seulement
    const st = (await statsParSource()).find((x) => x.sourceId === s.id)
    expect(st?.alerte).toBeNull()
    expect(st?.nbErreursRecentes).toBe(2)
  })

  it('un run OK RÉCENT dans la fenêtre casse l’alerte erreur', async () => {
    const s = await source()
    await exec(s.id, 'erreur', 0, t(30))
    await exec(s.id, 'erreur', 0, t(20))
    await exec(s.id, 'ok', 5, t(10)) // le plus récent est OK
    const st = (await statsParSource()).find((x) => x.sourceId === s.id)
    expect(st?.alerte).toBeNull() // pas 3 erreurs consécutives dans la fenêtre
    expect(st?.nbErreursRecentes).toBe(2)
  })

  it('taux null par division par zéro (aucun item décidé)', async () => {
    const s = await source()
    await item(s.id, 'a_valider')
    await item(s.id, 'en_attente')
    const st = (await statsParSource()).find((x) => x.sourceId === s.id)
    expect(st?.tauxApprobation).toBeNull()
    expect(st?.tauxRejet).toBeNull()
    expect(st?.nbRapportees).toBe(2)
  })

  it('chute_zero détectée MÊME si la production est ANCIENNE (hors fenêtre de 3)', async () => {
    const s = await source()
    // Production ancienne (bien avant les 3 derniers runs) puis longue série de zéros.
    await exec(s.id, 'ok', 20, t(120))
    for (let i = 6; i >= 1; i--) await exec(s.id, 'partiel', 0, t(i * 5))
    const st = (await statsParSource()).find((x) => x.sourceId === s.id)
    expect(st?.alerte).toBe('chute_zero') // la baseline non bornée garde l'alerte vivante
  })
})

describe('GUIC-602 — resumeCuration', () => {
  it('agrège les totaux et le nombre de sources en alerte', async () => {
    const s1 = await source()
    await exec(s1.id, 'erreur', 0, t(30))
    await exec(s1.id, 'erreur', 0, t(20))
    await exec(s1.id, 'erreur', 0, t(10))
    await source() // saine, sans exécution

    const r = await resumeCuration()
    expect(r.nbSources).toBeGreaterThanOrEqual(2)
    expect(r.nbEnAlerte).toBeGreaterThanOrEqual(1)
  })
})
