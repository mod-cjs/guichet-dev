/**
 * @jest-environment node
 *
 * GUIC-689 (M4, lot 1) — Le modèle de sortie de centre.
 *
 * INTÉGRATION RÉELLE : prisma n'est pas mocké. Un modèle se prouve en écrivant
 * en base, pas en relisant le schéma.
 *
 * Décisions validées par le lead le 2026-08-17, détaillées dans
 * `.agent_context/specs/M4-checkin-checkout-scan.md` :
 *
 *  - **table distincte**, jamais un sens `Entree`/`Sortie` dans `check_ins` :
 *    neuf points de comptage lisent cette table, et le flux Data Hub la décrit
 *    comme « la mesure de fréquentation réelle ». Un doublement y serait
 *    silencieux, jusque dans l'export public ;
 *  - **append-only**, comme `check_ins` : la durée est calculée à l'insertion et
 *    portée par la sortie. Renseigner `dwellMinutes` sur l'entrée supposerait de
 *    la MODIFIER, or la clé de réplication est `effectueA` — une ligne modifiée
 *    sans que `effectueA` bouge n'est jamais relue par l'ETL ;
 *  - **sortie orpheline acceptée** (`checkInId` nul) : refuser au comptoir
 *    n'apprend rien à la personne et perd la trace.
 */
import { prisma } from '@/lib/prisma'

jest.setTimeout(30000)

const PREFIX = 'Fixture sortie GUIC-M4'
const UID = 'fixture-sortie-m4'

let centreId: string

/** Nettoyage en ENTRÉE aussi : un run interrompu laisse ses lignes derrière lui. */
async function purger() {
  const centres = await prisma.centre.findMany({ where: { nom: PREFIX }, select: { id: true } })
  const ids = centres.map((c) => c.id)
  if (ids.length) {
    await prisma.sortieCentre.deleteMany({ where: { centreId: { in: ids } } })
    await prisma.checkIn.deleteMany({ where: { centreId: { in: ids } } })
    await prisma.centre.deleteMany({ where: { id: { in: ids } } })
  }
  await prisma.utilisateur.deleteMany({ where: { cjsUid: UID } })
}

beforeAll(async () => {
  await purger()
  await prisma.utilisateur.create({ data: { cjsUid: UID, nom: 'Fixture', prenom: 'Sortie' } })
  const c = await prisma.centre.create({
    data: {
      nom: PREFIX, region: 'Dakar', adresse: 'Fixture intégration',
      latitude: 14.69, longitude: -17.44, telephone: '+221338000900', responsable: 'Fixture',
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

const entree = () =>
  prisma.checkIn.create({
    data: { cjsUid: UID, centreId, via: 'QrCard' },
    select: { id: true },
  })

describe('GUIC-689 (M4) — la sortie s’écrit sans toucher à l’entrée', () => {
  it('une sortie appariée porte sa durée, l’entrée reste intacte', async () => {
    const e = await entree()
    const avant = await prisma.checkIn.findUniqueOrThrow({ where: { id: e.id } })

    await prisma.sortieCentre.create({
      data: { checkInId: e.id, cjsUid: UID, centreId, via: 'QrCard', dureeMinutes: 45 },
    })

    const apres = await prisma.checkIn.findUniqueOrThrow({ where: { id: e.id } })
    // Append-only : l'entrée n'a pas bougé d'un octet, donc son `effectueA`
    // (clé de réplication) reste valide pour l'ETL.
    expect(apres.effectueA.getTime()).toBe(avant.effectueA.getTime())
    expect(apres.dwellMinutes).toBeNull()

    const s = await prisma.sortieCentre.findFirstOrThrow({ where: { checkInId: e.id } })
    expect(s.dureeMinutes).toBe(45)
  })

  it('une entrée ne peut avoir QU’UNE sortie — un jeton rejoué ne la duplique pas', async () => {
    const e = await entree()
    await prisma.sortieCentre.create({ data: { checkInId: e.id, cjsUid: UID, centreId, via: 'QrCard' } })

    await expect(
      prisma.sortieCentre.create({ data: { checkInId: e.id, cjsUid: UID, centreId, via: 'QrCard' } }),
    ).rejects.toThrow(/Unique constraint/i)
  })

  it('le nonce de jeton est unique — protection d’idempotence, comme sur l’entrée', async () => {
    const e = await entree()
    await prisma.sortieCentre.create({
      data: { checkInId: e.id, cjsUid: UID, centreId, via: 'QrCard', jwtNonce: 'nonce-m4-1' },
    })
    await expect(
      prisma.sortieCentre.create({ data: { cjsUid: UID, centreId, via: 'QrCard', jwtNonce: 'nonce-m4-1' } }),
    ).rejects.toThrow(/Unique constraint/i)
  })
})

describe('GUIC-689 (M4) — la sortie orpheline est acceptée', () => {
  it('sans entrée appariée : enregistrée, sans durée', async () => {
    const s = await prisma.sortieCentre.create({
      data: { cjsUid: UID, centreId, via: 'Manuel' },
    })
    expect(s.checkInId).toBeNull()
    // Pas de durée inventée : on ne sait pas quand la personne est arrivée.
    expect(s.dureeMinutes).toBeNull()
  })

  it('plusieurs orphelines coexistent — l’unicité porte sur l’entrée, pas sur son absence', async () => {
    await prisma.sortieCentre.create({ data: { cjsUid: UID, centreId, via: 'Manuel' } })
    await prisma.sortieCentre.create({ data: { cjsUid: UID, centreId, via: 'Manuel' } })
    expect(await prisma.sortieCentre.count({ where: { centreId, checkInId: null } })).toBe(2)
  })
})

describe('GUIC-689 (M4) — `check_ins` reste la mesure de fréquentation', () => {
  it('écrire une sortie n’ajoute AUCUNE ligne de passage', async () => {
    const avant = await prisma.checkIn.count({ where: { centreId } })
    const e = await entree()
    await prisma.sortieCentre.create({ data: { checkInId: e.id, cjsUid: UID, centreId, via: 'QrCard' } })

    // Le cœur de la décision : les neuf points de comptage existants n'ont pas
    // à être repris, et l'export public ne double pas.
    expect(await prisma.checkIn.count({ where: { centreId } })).toBe(avant + 1)
  })
})
