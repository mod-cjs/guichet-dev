/**
 * @jest-environment node
 *
 * GUIC-684 — Helper générique de rattachement aux programmes (M:N).
 *
 * Prisma n'a pas de relation polymorphique : une jonction par entité
 * (`opportunites_programmes`, `ressources_programmes`, `evenements_programmes`).
 * Toute la logique vit ici — les 3 entités s'y branchent, donc c'est le seul
 * endroit testé en profondeur.
 *
 * Invariants couverts :
 *  - au plus UN `principal = true` par entité ;
 *  - le premier programme rattaché devient principal automatiquement ;
 *  - au moins un programme (refus explicite d'une liste vide) ;
 *  - slug inconnu → refus (jamais de rattachement silencieusement perdu) ;
 *  - remplacement = purge + recréation (pas d'accumulation).
 */

type MockFn = jest.Mock

const programmeModel = {
  findMany: jest.fn() as MockFn,
}

/** Délégué de jonction (forme commune aux 3 tables). */
function makeJonction() {
  return {
    deleteMany: jest.fn() as MockFn,
    createMany: jest.fn() as MockFn,
    findMany: jest.fn() as MockFn,
  }
}

const PROGRAMMES = [
  { id: 'p-yaakaar', slug: 'yaakaar' },
  { id: 'p-yeah', slug: 'yeah' },
  { id: 'p-yjc', slug: 'yjc' },
  { id: 'p-edupop', slug: 'edupop' },
]

import {
  replaceProgrammes,
  assertAuMoinsUnProgramme,
  ProgrammeInconnuError,
  ProgrammeRequisError,
} from '@/lib/programmes/rattachement'

describe('replaceProgrammes — rattachement générique', () => {
  let jonction: ReturnType<typeof makeJonction>

  beforeEach(() => {
    jest.clearAllMocks()
    jonction = makeJonction()
    programmeModel.findMany.mockResolvedValue(PROGRAMMES)
  })

  function tx() {
    return { programme: programmeModel } as never
  }

  it('purge les rattachements existants avant de recréer (pas d’accumulation)', async () => {
    await replaceProgrammes(tx(), jonction as never, 'opportuniteId', 'o-1', ['yeah'])

    expect(jonction.deleteMany).toHaveBeenCalledWith({ where: { opportuniteId: 'o-1' } })
    const ordre = jonction.deleteMany.mock.invocationCallOrder[0]
    expect(jonction.createMany.mock.invocationCallOrder[0]).toBeGreaterThan(ordre)
  })

  it('rend le PREMIER programme principal quand aucun n’est désigné', async () => {
    await replaceProgrammes(tx(), jonction as never, 'opportuniteId', 'o-1', ['yeah', 'edupop'])

    expect(jonction.createMany).toHaveBeenCalledWith({
      data: [
        { opportuniteId: 'o-1', programmeId: 'p-yeah', principal: true },
        { opportuniteId: 'o-1', programmeId: 'p-edupop', principal: false },
      ],
    })
  })

  it('respecte le principal explicitement désigné', async () => {
    await replaceProgrammes(tx(), jonction as never, 'opportuniteId', 'o-1', ['yeah', 'edupop'], {
      principalSlug: 'edupop',
    })

    expect(jonction.createMany).toHaveBeenCalledWith({
      data: [
        { opportuniteId: 'o-1', programmeId: 'p-yeah', principal: false },
        { opportuniteId: 'o-1', programmeId: 'p-edupop', principal: true },
      ],
    })
  })

  it('n’écrit JAMAIS deux principaux, même si le slug principal est dupliqué', async () => {
    await replaceProgrammes(tx(), jonction as never, 'opportuniteId', 'o-1', ['yeah', 'yeah', 'edupop'])

    const { data } = jonction.createMany.mock.calls[0][0]
    expect(data.filter((r: { principal: boolean }) => r.principal)).toHaveLength(1)
    // Doublon écarté : 2 lignes, pas 3 (la PK composite refuserait le doublon).
    expect(data).toHaveLength(2)
  })

  it('refuse une liste vide — un contenu doit relever d’au moins un programme', async () => {
    await expect(
      replaceProgrammes(tx(), jonction as never, 'opportuniteId', 'o-1', []),
    ).rejects.toBeInstanceOf(ProgrammeRequisError)
    expect(jonction.deleteMany).not.toHaveBeenCalled()
  })

  it('refuse un slug inconnu plutôt que de perdre le rattachement en silence', async () => {
    await expect(
      replaceProgrammes(tx(), jonction as never, 'opportuniteId', 'o-1', ['yeah', 'inexistant']),
    ).rejects.toBeInstanceOf(ProgrammeInconnuError)
    expect(jonction.createMany).not.toHaveBeenCalled()
  })

  it('fonctionne à l’identique sur une autre entité (clé étrangère paramétrée)', async () => {
    await replaceProgrammes(tx(), jonction as never, 'ressourceId', 'r-9', ['yjc'])

    expect(jonction.deleteMany).toHaveBeenCalledWith({ where: { ressourceId: 'r-9' } })
    expect(jonction.createMany).toHaveBeenCalledWith({
      data: [{ ressourceId: 'r-9', programmeId: 'p-yjc', principal: true }],
    })
  })
})

describe('assertAuMoinsUnProgramme — garde de formulaire', () => {
  it('laisse passer une liste non vide', () => {
    expect(() => assertAuMoinsUnProgramme(['yeah'])).not.toThrow()
  })

  it('refuse undefined et la liste vide', () => {
    expect(() => assertAuMoinsUnProgramme(undefined)).toThrow(ProgrammeRequisError)
    expect(() => assertAuMoinsUnProgramme([])).toThrow(ProgrammeRequisError)
  })
})
