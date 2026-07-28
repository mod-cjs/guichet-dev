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

/**
 * Port de jonction : deux fermetures fournies par l'appelant (la clé étrangère est
 * de sa responsabilité), ce qui évite de transtyper les délégués Prisma typés par table.
 */
function makePort() {
  return {
    purge: jest.fn() as MockFn,
    creer: jest.fn() as MockFn,
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
  let port: ReturnType<typeof makePort>

  beforeEach(() => {
    jest.clearAllMocks()
    port = makePort()
    programmeModel.findMany.mockResolvedValue(PROGRAMMES)
  })

  function tx() {
    return { programme: programmeModel } as never
  }

  it('purge les rattachements existants avant de recréer (pas d’accumulation)', async () => {
    await replaceProgrammes(tx(), port, ['yeah'])

    expect(port.purge).toHaveBeenCalled()
    const ordre = port.purge.mock.invocationCallOrder[0]
    expect(port.creer.mock.invocationCallOrder[0]).toBeGreaterThan(ordre)
  })

  it('rend le PREMIER programme principal quand aucun n’est désigné', async () => {
    await replaceProgrammes(tx(), port, ['yeah', 'edupop'])

    expect(port.creer).toHaveBeenCalledWith([
      { programmeId: 'p-yeah', principal: true },
      { programmeId: 'p-edupop', principal: false },
    ])
  })

  it('respecte le principal explicitement désigné', async () => {
    await replaceProgrammes(tx(), port, ['yeah', 'edupop'], { principalSlug: 'edupop' })

    expect(port.creer).toHaveBeenCalledWith([
      { programmeId: 'p-yeah', principal: false },
      { programmeId: 'p-edupop', principal: true },
    ])
  })

  it('n’écrit JAMAIS deux principaux, même si le slug principal est dupliqué', async () => {
    await replaceProgrammes(tx(), port, ['yeah', 'yeah', 'edupop'])

    const rows = port.creer.mock.calls[0][0]
    expect(rows.filter((r: { principal: boolean }) => r.principal)).toHaveLength(1)
    // Doublon écarté : 2 lignes, pas 3 (la PK composite refuserait le doublon).
    expect(rows).toHaveLength(2)
  })

  it('refuse une liste vide — un contenu doit relever d’au moins un programme', async () => {
    await expect(replaceProgrammes(tx(), port, [])).rejects.toBeInstanceOf(ProgrammeRequisError)
    expect(port.purge).not.toHaveBeenCalled()
  })

  it('refuse un slug inconnu plutôt que de perdre le rattachement en silence', async () => {
    await expect(
      replaceProgrammes(tx(), port, ['yeah', 'inexistant']),
    ).rejects.toBeInstanceOf(ProgrammeInconnuError)
    expect(port.creer).not.toHaveBeenCalled()
    // La purge non plus : on n'ampute pas les rattachements existants sur une erreur.
    expect(port.purge).not.toHaveBeenCalled()
  })

  it('reste agnostique de l’entité — le port porte la clé étrangère', async () => {
    await replaceProgrammes(tx(), port, ['yjc'])

    expect(port.creer).toHaveBeenCalledWith([{ programmeId: 'p-yjc', principal: true }])
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
