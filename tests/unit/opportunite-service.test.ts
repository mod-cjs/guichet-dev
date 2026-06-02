/**
 * @jest-environment node
 *
 * GUIC-183 — Tests unitaires `OpportuniteService` (M3 v2 — 178b/4).
 *
 * Prisma est mocké : on vérifie que le service délègue correctement aux bonnes
 * tables sous-types selon le `type` et que l'invariant XOR est respecté.
 */

// ─── Mock Prisma ──────────────────────────────────────────────────────────

type MockFn = jest.Mock

function makeModel(): Record<string, MockFn> {
  return {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  }
}

const mocks = {
  opportunite: makeModel(),
  opportuniteType: makeModel(),
  programme: makeModel(),
  opportuniteEmploi: makeModel(),
  opportuniteStage: makeModel(),
  opportuniteFormation: makeModel(),
  opportuniteBourse: makeModel(),
  opportuniteConcours: makeModel(),
  opportuniteAppelAProjets: makeModel(),
  opportuniteSkill: makeModel(),
  opportuniteTag: makeModel(),
}

// Pour `$transaction(cb)` : on rejoue le callback avec les mêmes mocks.
const mockTransaction = jest.fn(async (cb: (tx: typeof mocks) => unknown) => cb(mocks))

const prismaMock = { ...mocks, $transaction: mockTransaction }

jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { OpportuniteService, assertAvecDetails, legacyTypeFromSlug } from '@/lib/services/opportunite-service'

// ─── Fixtures ──────────────────────────────────────────────────────────────

const typeRow = (slug: string) => ({ id: `type-${slug}`, slug, libelle: slug, actionLabel: 'Postuler' })
const programmeRow = (slug: string) => ({ id: `prog-${slug}`, slug, nom: slug })

function baseInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    titre: 'Mon titre',
    slug: 'mon-titre',
    description: 'desc',
    organisationLibelle: 'CJS',
    domaine: 'Numerique',
    region: 'Dakar',
    ...overrides,
  }
}

function freshOpp(id: string, slug: string, sub: Record<string, unknown>) {
  return {
    id,
    slug: 'mon-titre',
    titre: 'Mon titre',
    description: 'desc',
    deletedAt: null,
    typeRef: typeRow(slug),
    programme: null,
    skills: [],
    tags: [],
    emploi: null,
    stage: null,
    formation: null,
    bourse: null,
    concours: null,
    appelAProjets: null,
    ...sub,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  // Programme.findUnique : retourne null par défaut (pas de programme)
  mocks.programme.findUnique.mockResolvedValue(null)
})

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('OpportuniteService.create', () => {
  const cases: Array<{
    type: 'emploi' | 'stage' | 'formation' | 'bourse' | 'concours' | 'appel_a_projets'
    subModel: keyof typeof mocks
    details: Record<string, unknown>
    expectedSubKey: string
    expectedSub: Record<string, unknown>
  }> = [
    {
      type: 'emploi',
      subModel: 'opportuniteEmploi',
      details: { typeContrat: 'CDI', teletravail: true },
      expectedSubKey: 'emploi',
      expectedSub: { typeContrat: 'CDI', teletravail: true },
    },
    {
      type: 'stage',
      subModel: 'opportuniteStage',
      details: { dureeMois: 6, indemnise: true },
      expectedSubKey: 'stage',
      expectedSub: { dureeMois: 6, indemnise: true },
    },
    {
      type: 'formation',
      subModel: 'opportuniteFormation',
      details: { dureeHeures: 40, modalite: 'HYBRIDE' },
      expectedSubKey: 'formation',
      expectedSub: { dureeHeures: 40, modalite: 'HYBRIDE' },
    },
    {
      type: 'bourse',
      subModel: 'opportuniteBourse',
      details: { montantTotalFcfa: 2_000_000, organismeFinanceur: 'CJS' },
      expectedSubKey: 'bourse',
      expectedSub: { montantTotalFcfa: 2_000_000, organismeFinanceur: 'CJS' },
    },
    {
      type: 'concours',
      subModel: 'opportuniteConcours',
      details: { organismeOrganisateur: 'Min. Jeunesse' },
      expectedSubKey: 'concours',
      expectedSub: { organismeOrganisateur: 'Min. Jeunesse' },
    },
    {
      type: 'appel_a_projets',
      subModel: 'opportuniteAppelAProjets',
      details: { dossierRequis: 'PDF', criteresEligibilite: 'Sénégal' },
      expectedSubKey: 'appelAProjets',
      expectedSub: { dossierRequis: 'PDF', criteresEligibilite: 'Sénégal' },
    },
  ]

  it.each(cases)('crée table mère + sous-type %s', async ({ type, subModel, details, expectedSubKey, expectedSub }) => {
    mocks.opportuniteType.findUnique.mockResolvedValue(typeRow(type))
    mocks.opportunite.create.mockResolvedValue({ id: 'opp-1' })
    mocks.opportunite.findUnique.mockResolvedValue(freshOpp('opp-1', type, { [expectedSubKey]: expectedSub }))
    ;(mocks[subModel].create as MockFn).mockResolvedValue({})

    const svc = new OpportuniteService(prismaMock as never)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await svc.create({ type, base: baseInput() as any, details: details as any })

    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mocks.opportunite.create).toHaveBeenCalledTimes(1)
    const createArgs = mocks.opportunite.create.mock.calls[0][0]
    expect(createArgs.data.typeId).toBe(`type-${type}`)
    expect(createArgs.data.type).toBe(legacyTypeFromSlug(type))
    expect(mocks[subModel].create).toHaveBeenCalledTimes(1)
    expect(res.id).toBe('opp-1')
    // L'assertion XOR a été appliquée : exactement 1 sous-type non null aligné sur typeRef.slug
    expect((res as unknown as Record<string, unknown>)[expectedSubKey]).toBeTruthy()
  })

  it('rejette si le type slug est inconnu en base', async () => {
    mocks.opportuniteType.findUnique.mockResolvedValue(null)
    const svc = new OpportuniteService(prismaMock as never)
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      svc.create({ type: 'emploi', base: baseInput() as any, details: { typeContrat: 'CDI' } as any }),
    ).rejects.toThrow(/OpportuniteType introuvable/)
    expect(mocks.opportunite.create).not.toHaveBeenCalled()
  })

  it('résout `programmeSlug` en `programmeId` dans la transaction', async () => {
    mocks.opportuniteType.findUnique.mockResolvedValue(typeRow('stage'))
    mocks.programme.findUnique.mockResolvedValue(programmeRow('yjc'))
    mocks.opportunite.create.mockResolvedValue({ id: 'opp-2' })
    mocks.opportuniteStage.create.mockResolvedValue({})
    mocks.opportunite.findUnique.mockResolvedValue(
      freshOpp('opp-2', 'stage', { stage: { dureeMois: 3 } }),
    )

    const svc = new OpportuniteService(prismaMock as never)
    await svc.create({
      type: 'stage',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      base: baseInput({ programmeSlug: 'yjc' }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details: { dureeMois: 3 } as any,
    })
    expect(mocks.programme.findUnique).toHaveBeenCalledWith({ where: { slug: 'yjc' } })
    expect(mocks.opportunite.create.mock.calls[0][0].data.programmeId).toBe('prog-yjc')
  })

  it('attache les skills et tags (replaceSkills + replaceTags appelés)', async () => {
    mocks.opportuniteType.findUnique.mockResolvedValue(typeRow('emploi'))
    mocks.opportunite.create.mockResolvedValue({ id: 'opp-3' })
    mocks.opportuniteEmploi.create.mockResolvedValue({})
    mocks.opportunite.findUnique.mockResolvedValue(
      freshOpp('opp-3', 'emploi', { emploi: { typeContrat: 'CDI' } }),
    )

    const svc = new OpportuniteService(prismaMock as never)
    await svc.create({
      type: 'emploi',
      base: baseInput({
        skills: [{ skillId: 's1', requise: false }, { skillId: 's2' }],
        tags: [{ tagId: 't1' }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details: { typeContrat: 'CDI' } as any,
    })
    expect(mocks.opportuniteSkill.deleteMany).toHaveBeenCalledWith({ where: { opportuniteId: 'opp-3' } })
    expect(mocks.opportuniteSkill.createMany).toHaveBeenCalledWith({
      data: [
        { opportuniteId: 'opp-3', skillId: 's1', requise: false },
        { opportuniteId: 'opp-3', skillId: 's2', requise: true },
      ],
    })
    expect(mocks.opportuniteTag.deleteMany).toHaveBeenCalledWith({ where: { opportuniteId: 'opp-3' } })
    expect(mocks.opportuniteTag.createMany).toHaveBeenCalledWith({
      data: [{ opportuniteId: 'opp-3', tagId: 't1' }],
    })
  })
})

describe('OpportuniteService.findByIdWithDetails', () => {
  it('retourne le sous-type discriminé bon', async () => {
    mocks.opportunite.findUnique.mockResolvedValue(
      freshOpp('o', 'bourse', { bourse: { montantTotalFcfa: 100 } }),
    )
    const svc = new OpportuniteService(prismaMock as never)
    const res = await svc.findByIdWithDetails('o')
    expect(res).not.toBeNull()
    expect(res!.typeRef.slug).toBe('bourse')
    expect(res!.bourse).toEqual({ montantTotalFcfa: 100 })
  })

  it('retourne null si soft-deleted', async () => {
    mocks.opportunite.findUnique.mockResolvedValue({
      ...freshOpp('o', 'emploi', { emploi: { typeContrat: 'CDI' } }),
      deletedAt: new Date(),
    })
    const svc = new OpportuniteService(prismaMock as never)
    expect(await svc.findByIdWithDetails('o')).toBeNull()
  })
})

describe('OpportuniteService.update', () => {
  it('met à jour la mère et le sous-type dans la même transaction', async () => {
    mocks.opportunite.findUnique
      .mockResolvedValueOnce({ id: 'opp-x', typeRef: typeRow('stage') })
      .mockResolvedValueOnce(freshOpp('opp-x', 'stage', { stage: { dureeMois: 12 } }))
    mocks.opportunite.update.mockResolvedValue({})
    mocks.opportuniteStage.update.mockResolvedValue({})

    const svc = new OpportuniteService(prismaMock as never)
    await svc.update('opp-x', { base: { titre: 'Nouveau titre' }, details: { dureeMois: 12 } })

    expect(mocks.opportunite.update).toHaveBeenCalledWith({
      where: { id: 'opp-x' },
      data: expect.objectContaining({ titre: 'Nouveau titre' }),
    })
    expect(mocks.opportuniteStage.update).toHaveBeenCalledWith({
      where: { opportuniteId: 'opp-x' },
      data: { dureeMois: 12 },
    })
  })
})

describe('OpportuniteService.delete', () => {
  it('appelle prisma.opportunite.delete (cascade SQL → sous-type)', async () => {
    const svc = new OpportuniteService(prismaMock as never)
    await svc.delete('opp-d')
    expect(mocks.opportunite.delete).toHaveBeenCalledWith({ where: { id: 'opp-d' } })
  })
})

describe('assertAvecDetails — invariant XOR', () => {
  it('accepte exactement 1 sous-type aligné sur typeRef.slug', () => {
    const row = freshOpp('o', 'emploi', { emploi: { typeContrat: 'CDI' } })
    expect(() => assertAvecDetails(row)).not.toThrow()
  })

  it('rejette aucun sous-type', () => {
    const row = freshOpp('o', 'emploi', {})
    expect(() => assertAvecDetails(row)).toThrow(/invariant XOR/)
  })

  it('rejette plusieurs sous-types', () => {
    const row = freshOpp('o', 'emploi', {
      emploi: { typeContrat: 'CDI' },
      stage: { dureeMois: 3 },
    })
    expect(() => assertAvecDetails(row)).toThrow(/invariant XOR/)
  })

  it('rejette une incohérence type ↔ sous-type', () => {
    const row = freshOpp('o', 'emploi', { stage: { dureeMois: 3 } })
    expect(() => assertAvecDetails(row)).toThrow(/incohérent avec typeRef\.slug/)
  })

  it('rejette si typeRef est manquant', () => {
    const row = { ...freshOpp('o', 'emploi', { emploi: { typeContrat: 'CDI' } }), typeRef: null }
    expect(() => assertAvecDetails(row)).toThrow(/typeRef manquant/)
  })
})
