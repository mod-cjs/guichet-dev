/**
 * @jest-environment node
 *
 * GUIC-689 (M4, lot 2) — Appariement de la sortie et calcul de durée.
 *
 * INTÉGRATION RÉELLE : prisma n'est pas mocké. L'appariement est une question
 * de concurrence et d'ordre en base ; un mock ne prouverait rien.
 *
 * Règle validée (spec M4, D-4) : **dernière entrée du même jeune, dans le même
 * centre, sans sortie appariée**. Les allers-retours dans la journée
 * fonctionnent alors naturellement, et un oubli de sortie ne vient pas se
 * coller à la visite suivante.
 */
import { prisma } from '@/lib/prisma'

import { enregistrerSortie } from '@/lib/centres/sortie'

jest.setTimeout(30000)

const PREFIX = 'Fixture appariement GUIC-M4'
const UID = 'fixture-appariement-m4'
const AUTRE_UID = 'fixture-appariement-m4-bis'

let centreA: string
let centreB: string

async function purger() {
  const centres = await prisma.centre.findMany({ where: { nom: { startsWith: PREFIX } }, select: { id: true } })
  const ids = centres.map((c) => c.id)
  if (ids.length) {
    await prisma.sortieCentre.deleteMany({ where: { centreId: { in: ids } } })
    await prisma.checkIn.deleteMany({ where: { centreId: { in: ids } } })
    await prisma.centre.deleteMany({ where: { id: { in: ids } } })
  }
  await prisma.utilisateur.deleteMany({ where: { cjsUid: { in: [UID, AUTRE_UID] } } })
}

const creerCentre = (suffixe: string) =>
  prisma.centre.create({
    data: {
      nom: `${PREFIX} ${suffixe}`, region: 'Dakar', adresse: 'Fixture',
      latitude: 14.69, longitude: -17.44, telephone: '+22133800091', responsable: 'Fixture',
    },
    select: { id: true },
  })

beforeAll(async () => {
  await purger()
  for (const uid of [UID, AUTRE_UID]) {
    await prisma.utilisateur.create({ data: { cjsUid: uid, nom: 'Fixture', prenom: uid } })
  }
  centreA = (await creerCentre('A')).id
  centreB = (await creerCentre('B')).id
})

afterEach(async () => {
  await prisma.sortieCentre.deleteMany({ where: { centreId: { in: [centreA, centreB] } } })
  await prisma.checkIn.deleteMany({ where: { centreId: { in: [centreA, centreB] } } })
})

afterAll(async () => {
  await purger().catch(() => {})
  await prisma.$disconnect()
})

/** Entrée datée : `ilYaMinutes` minutes avant maintenant. */
async function entree(centreId: string, ilYaMinutes = 0, cjsUid = UID) {
  const effectueA = new Date(Date.now() - ilYaMinutes * 60_000)
  return prisma.checkIn.create({
    data: { cjsUid, centreId, via: 'QrCard', effectueA },
    select: { id: true },
  })
}

describe('GUIC-689 (M4) — appariement nominal', () => {
  it('apparie la dernière entrée ouverte et calcule la durée', async () => {
    const e = await entree(centreA, 45)
    const s = await enregistrerSortie({ cjsUid: UID, centreId: centreA, via: 'QrCard' })

    expect(s.checkInId).toBe(e.id)
    // Tolérance d'une minute : le test s'exécute, le temps passe.
    expect(s.dureeMinutes).toBeGreaterThanOrEqual(44)
    expect(s.dureeMinutes).toBeLessThanOrEqual(46)
  })

  it('une sortie immédiate donne 0, pas null — 0 minute est une durée réelle', async () => {
    await entree(centreA, 0)
    const s = await enregistrerSortie({ cjsUid: UID, centreId: centreA, via: 'QrCard' })
    expect(s.dureeMinutes).toBe(0)
  })
})

describe('GUIC-689 (M4) — plusieurs passages, un oubli', () => {
  it('deux visites le même jour : la seconde sortie apparie la SECONDE entrée', async () => {
    const premiere = await entree(centreA, 300)
    await enregistrerSortie({ cjsUid: UID, centreId: centreA, via: 'QrCard' })

    const seconde = await entree(centreA, 20)
    const s2 = await enregistrerSortie({ cjsUid: UID, centreId: centreA, via: 'QrCard' })

    expect(s2.checkInId).toBe(seconde.id)
    expect(s2.checkInId).not.toBe(premiere.id)
  })

  it('une entrée oubliée reste OUVERTE — elle ne se colle pas à la visite suivante', async () => {
    const oubliee = await entree(centreA, 600)
    const recente = await entree(centreA, 10)

    const s = await enregistrerSortie({ cjsUid: UID, centreId: centreA, via: 'QrCard' })
    expect(s.checkInId).toBe(recente.id)

    // L'entrée oubliée n'a toujours pas de sortie : c'est l'information vraie,
    // et elle ne doit pas être clôturée d'office (spec M4, D-2).
    const sortieDeLOubliee = await prisma.sortieCentre.findUnique({ where: { checkInId: oubliee.id } })
    expect(sortieDeLOubliee).toBeNull()
  })
})

describe('GUIC-689 (M4) — ce qui ne s’apparie PAS', () => {
  it('aucune entrée → sortie orpheline, sans durée', async () => {
    const s = await enregistrerSortie({ cjsUid: UID, centreId: centreA, via: 'Manuel' })
    expect(s.checkInId).toBeNull()
    expect(s.dureeMinutes).toBeNull()
  })

  it('entrée dans un AUTRE centre → orpheline, jamais rattachée de force', async () => {
    await entree(centreB, 30)
    const s = await enregistrerSortie({ cjsUid: UID, centreId: centreA, via: 'QrCard' })
    expect(s.checkInId).toBeNull()
  })

  it('entrée d’un AUTRE jeune → orpheline', async () => {
    await entree(centreA, 30, AUTRE_UID)
    const s = await enregistrerSortie({ cjsUid: UID, centreId: centreA, via: 'QrCard' })
    expect(s.checkInId).toBeNull()
  })
})

describe('GUIC-689 (M4) — double scan', () => {
  it('même jeton rejoué → UNE seule sortie, même identifiant', async () => {
    await entree(centreA, 15)
    const a = await enregistrerSortie({ cjsUid: UID, centreId: centreA, via: 'QrCard', jwtNonce: 'nonce-app-1' })
    const b = await enregistrerSortie({ cjsUid: UID, centreId: centreA, via: 'QrCard', jwtNonce: 'nonce-app-1' })

    expect(b.id).toBe(a.id)
    expect(await prisma.sortieCentre.count({ where: { centreId: centreA } })).toBe(1)
  })

  it('deux sorties SIMULTANÉES sur la même entrée → une seule appariée', async () => {
    const e = await entree(centreA, 25)
    const [x, y] = await Promise.all([
      enregistrerSortie({ cjsUid: UID, centreId: centreA, via: 'QrCard' }),
      enregistrerSortie({ cjsUid: UID, centreId: centreA, via: 'QrCard' }),
    ])

    const appariees = [x, y].filter((s) => s.checkInId === e.id)
    // La contrainte d'unicité tranche : l'autre devient orpheline plutôt que
    // d'échouer au comptoir.
    expect(appariees).toHaveLength(1)
    expect(await prisma.sortieCentre.count({ where: { centreId: centreA } })).toBe(2)
  })
})
