/**
 * @jest-environment node
 *
 * GUIC-689 (M4, lot 4) — Restitution : qui est là, et ce qu'on sait vraiment.
 *
 * INTÉGRATION RÉELLE : prisma n'est pas mocké.
 *
 * Deux exigences de la spec M4 :
 *
 *  - **D-2** aucune clôture automatique. « Qui est présent » se calcule à
 *    l'affichage — entrées du jour sans sortie appariée — et rien n'est stocké.
 *    Une entrée oubliée reste donc ouverte, et c'est correct.
 *
 *  - **rien d'inventé.** Beaucoup partiront sans scanner. On publie donc
 *    « durée mesurée sur N % des passages » plutôt qu'une moyenne adossée à des
 *    heures supposées. Sans mesure, la moyenne vaut `null` — jamais 0, qui se
 *    lirait comme « ils sont repartis aussitôt ».
 */
import { prisma } from '@/lib/prisma'

import { etatFrequentation } from '@/lib/centres/frequentation'

jest.setTimeout(30000)

const PREFIX = 'Fixture restitution GUIC-M4'
const UIDS = ['fixture-resti-1', 'fixture-resti-2', 'fixture-resti-3']

let centreId: string

async function purger() {
  const centres = await prisma.centre.findMany({ where: { nom: PREFIX }, select: { id: true } })
  const ids = centres.map((c) => c.id)
  if (ids.length) {
    await prisma.sortieCentre.deleteMany({ where: { centreId: { in: ids } } })
    await prisma.checkIn.deleteMany({ where: { centreId: { in: ids } } })
    await prisma.centre.deleteMany({ where: { id: { in: ids } } })
  }
  await prisma.utilisateur.deleteMany({ where: { cjsUid: { in: UIDS } } })
}

beforeAll(async () => {
  await purger()
  for (const uid of UIDS) {
    await prisma.utilisateur.create({ data: { cjsUid: uid, nom: 'Fixture', prenom: uid } })
  }
  const c = await prisma.centre.create({
    data: {
      nom: PREFIX, region: 'Dakar', adresse: 'Fixture',
      latitude: 14.69, longitude: -17.44, telephone: '+22133800092', responsable: 'Fixture',
    },
    select: { id: true },
  })
  centreId = c.id
})

afterEach(async () => {
  await prisma.sortieCentre.deleteMany({ where: { centreId } })
  await prisma.checkIn.deleteMany({ where: { centreId } })
})

afterAll(async () => {
  await purger().catch(() => {})
  await prisma.$disconnect()
})

/** Passage : entrée il y a `ilYaMinutes`, et sortie appariée si `dureeMinutes`. */
async function passage(cjsUid: string, ilYaMinutes: number, dureeMinutes?: number) {
  const e = await prisma.checkIn.create({
    data: { cjsUid, centreId, via: 'QrCard', effectueA: new Date(Date.now() - ilYaMinutes * 60_000) },
    select: { id: true },
  })
  if (dureeMinutes !== undefined) {
    await prisma.sortieCentre.create({
      data: { checkInId: e.id, cjsUid, centreId, via: 'QrCard', dureeMinutes },
    })
  }
  return e.id
}

describe('GUIC-689 (M4) — qui est présent, calculé à l’affichage', () => {
  it('les entrées du jour sans sortie', async () => {
    await passage(UIDS[0], 90)          // encore là
    await passage(UIDS[1], 60, 30)      // reparti
    await passage(UIDS[2], 15)          // encore là

    const etat = await etatFrequentation(centreId)
    expect(etat.presents.map((p) => p.cjsUid).sort()).toEqual([UIDS[0], UIDS[2]].sort())
  })

  it('rien n’est stocké : la présence est une lecture, pas un état', async () => {
    await passage(UIDS[0], 30)
    const avant = await prisma.sortieCentre.count({ where: { centreId } })
    await etatFrequentation(centreId)
    expect(await prisma.sortieCentre.count({ where: { centreId } })).toBe(avant)
  })

  it('une entrée de la VEILLE ne compte pas parmi les présents du jour', async () => {
    await passage(UIDS[0], 60 * 30) // 30 h — hier
    const etat = await etatFrequentation(centreId)
    expect(etat.presents).toHaveLength(0)
  })
})

describe('GUIC-689 (M4) — ce qu’on sait de la durée, et rien de plus', () => {
  it('annonce la part réellement mesurée', async () => {
    await passage(UIDS[0], 120, 60)
    await passage(UIDS[1], 100, 40)
    await passage(UIDS[2], 30)          // parti sans scanner

    const etat = await etatFrequentation(centreId)
    expect(etat.duree.passages).toBe(3)
    expect(etat.duree.mesures).toBe(2)
    expect(etat.duree.partMesuree).toBe(67) // 2/3, arrondi
    expect(etat.duree.moyenneMinutes).toBe(50)
  })

  it('aucune sortie scannée → moyenne NULLE, jamais 0', async () => {
    await passage(UIDS[0], 45)
    await passage(UIDS[1], 20)

    const etat = await etatFrequentation(centreId)
    expect(etat.duree.mesures).toBe(0)
    expect(etat.duree.partMesuree).toBe(0)
    // 0 se lirait « ils sont repartis aussitôt ». On ne sait pas, on le dit.
    expect(etat.duree.moyenneMinutes).toBeNull()
  })

  it('une sortie ORPHELINE ne fausse pas la moyenne', async () => {
    await passage(UIDS[0], 60, 30)
    await prisma.sortieCentre.create({
      data: { cjsUid: UIDS[1], centreId, via: 'Manuel' }, // orpheline, sans durée
    })

    const etat = await etatFrequentation(centreId)
    expect(etat.duree.mesures).toBe(1)
    expect(etat.duree.moyenneMinutes).toBe(30)
  })

  it('aucun passage → tout à zéro, moyenne nulle, sans division par zéro', async () => {
    const etat = await etatFrequentation(centreId)
    expect(etat.duree).toEqual({ passages: 0, mesures: 0, partMesuree: 0, moyenneMinutes: null })
    expect(etat.presents).toEqual([])
  })
})
