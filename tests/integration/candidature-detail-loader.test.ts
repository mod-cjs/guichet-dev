/**
 * @jest-environment node
 *
 * Tests d'intégration du loader détail candidature (GUIC-253).
 *
 * Périmètre :
 *  - vérification d'ownership (clause where cjsUid)
 *  - retour `null` lorsque la row est introuvable / appartient à un autre uid
 *  - mapping des dates en ISO 8601
 */

const mockFindFirst = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { candidature: { findFirst: (...a: unknown[]) => mockFindFirst(...a) } },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadCandidatureDetail } = require('@/lib/candidature-detail-loader')

const ROW = {
  id: 'cand-1',
  statut: 'En_attente',
  lettreMotivation: 'Bonjour…',
  cvUrl: 'https://cdn/cv.pdf',
  soumiseA: new Date('2026-05-01T10:00:00Z'),
  updatedAt: new Date('2026-05-02T11:00:00Z'),
  opportunite: {
    slug: 'stage-data',
    titre: 'Stage Data',
    organisation: 'CJS',
    deadline: new Date('2026-06-30T23:59:59Z'),
    type: 'Stage',
    domaine: 'Numerique',
    description: 'Mission analytics…',
  },
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('loadCandidatureDetail()', () => {
  it('renvoie le DTO ISO-formé quand la candidature existe et appartient au cjsUid', async () => {
    mockFindFirst.mockResolvedValue(ROW)
    const dto = await loadCandidatureDetail('cand-1', 'uid-1')
    expect(dto).not.toBeNull()
    expect(dto.id).toBe('cand-1')
    expect(dto.statut).toBe('En_attente')
    expect(dto.soumiseA).toBe('2026-05-01T10:00:00.000Z')
    expect(dto.updatedAt).toBe('2026-05-02T11:00:00.000Z')
    expect(dto.opportunite.deadline).toBe('2026-06-30T23:59:59.000Z')
    expect(dto.opportunite.titre).toBe('Stage Data')
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cand-1', cjsUid: 'uid-1' } }),
    )
  })

  it('renvoie null si Prisma ne trouve aucune row (404 / ownership mismatch indifférenciables)', async () => {
    mockFindFirst.mockResolvedValue(null)
    expect(await loadCandidatureDetail('cand-1', 'uid-1')).toBeNull()
  })

  it('renvoie null sans interroger Prisma quand id ou cjsUid manquent', async () => {
    expect(await loadCandidatureDetail('', 'uid-1')).toBeNull()
    expect(await loadCandidatureDetail('cand-1', '')).toBeNull()
    expect(mockFindFirst).not.toHaveBeenCalled()
  })
})
