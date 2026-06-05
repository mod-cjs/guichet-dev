/**
 * @jest-environment node
 *
 * Tests du loader `loadMesCandidatures` (GUIC-237) — mapping statut Prisma →
 * étape pipeline UI + filtre cjsUid + tri.
 */

const mockFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { candidature: { findMany: (...a: unknown[]) => mockFindMany(...a) } },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadMesCandidatures, STATUT_TO_STEP } = require('@/lib/loaders/mes-candidatures')

function row(over: Partial<{
  id: string
  statut: string
  soumiseA: Date
  opportunite: { slug: string; titre: string; organisation: string; type: string }
}>) {
  return {
    id: 'c1',
    statut: 'En_attente',
    soumiseA: new Date('2026-05-01T00:00:00.000Z'),
    opportunite: { slug: 'stage-agri', titre: 'Stage agri', organisation: 'CJS', type: 'Stage' },
    ...over,
  }
}

beforeEach(() => jest.clearAllMocks())

describe('loadMesCandidatures', () => {
  it('renvoie [] si aucune candidature et filtre sur cjsUid', async () => {
    mockFindMany.mockResolvedValue([])
    const out = await loadMesCandidatures('uid-1')
    expect(out).toEqual([])
    expect(mockFindMany.mock.calls[0][0].where).toEqual({ cjsUid: 'uid-1' })
    expect(mockFindMany.mock.calls[0][0].orderBy).toEqual({ soumiseA: 'desc' })
  })

  it('mappe un En_attente vers currentStep=Envoyee, decision=null', async () => {
    mockFindMany.mockResolvedValue([row({})])
    const [it] = await loadMesCandidatures('uid-1')
    expect(it.currentStep).toBe('Envoyee')
    expect(it.decision).toBeNull()
    expect(it.envoyeeA).toBe('2026-05-01T00:00:00.000Z')
    expect(it.opportuniteSlug).toBe('stage-agri')
  })

  it('couvre les 4 statuts Prisma', async () => {
    expect(STATUT_TO_STEP.En_attente).toEqual({ currentStep: 'Envoyee', decision: null })
    expect(STATUT_TO_STEP.Vue).toEqual({ currentStep: 'EnRevue', decision: null })
    expect(STATUT_TO_STEP.Retenue).toEqual({ currentStep: 'Decision', decision: 'Acceptee' })
    expect(STATUT_TO_STEP.Refusee).toEqual({ currentStep: 'Decision', decision: 'Refusee' })
  })

  it('mappe Volontariat et Appel_a_projets vers libellés CandidatureMock', async () => {
    mockFindMany.mockResolvedValue([
      row({ id: 'a', opportunite: { slug: 'vol', titre: 'V', organisation: 'O', type: 'Volontariat' } }),
      row({ id: 'b', opportunite: { slug: 'ap', titre: 'A', organisation: 'O', type: 'Appel_a_projets' } }),
    ])
    const out = await loadMesCandidatures('uid-1')
    expect(out[0].type).toBe('Volontariat')
    expect(out[1].type).toBe('Appel à projets')
  })

  it('préserve l\'ordre desc renvoyé par Prisma (déjà trié)', async () => {
    mockFindMany.mockResolvedValue([
      row({ id: 'recent', soumiseA: new Date('2026-05-30T00:00:00.000Z') }),
      row({ id: 'old',    soumiseA: new Date('2026-04-01T00:00:00.000Z') }),
    ])
    const out = await loadMesCandidatures('uid-1')
    expect(out.map((r: { id: string }) => r.id)).toEqual(['recent', 'old'])
  })
})
