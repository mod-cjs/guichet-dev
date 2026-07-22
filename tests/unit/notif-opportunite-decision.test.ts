/**
 * @jest-environment node
 *
 * Test du wiring opportunite.approved / opportunite.rejected → recruteur (GUIC-547).
 */
const mockOppFind = jest.fn()
const mockUserFind = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: { findUnique: (...a: unknown[]) => mockOppFind(...a) },
    utilisateur: { findUnique: (...a: unknown[]) => mockUserFind(...a) },
  },
}))

const mockEmit = jest.fn()
jest.mock('@/lib/notifications/emit', () => ({ emitEvent: (...a: unknown[]) => mockEmit(...a) }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { notifyRecruteurDecisionOpportunite } from '@/lib/notifications/opportunite-decision'

beforeEach(() => {
  jest.clearAllMocks()
  mockOppFind.mockResolvedValue({ titre: 'Stage agro', recruteurUid: 'r1', org: null })
  mockUserFind.mockResolvedValue({ prenom: 'Moussa', telephone: '+221770000001', email: 'm@org.sn' })
  mockEmit.mockResolvedValue(undefined)
})

describe('notifyRecruteurDecisionOpportunite', () => {
  it('émet opportunite.approved vers le recruteur propriétaire', async () => {
    await notifyRecruteurDecisionOpportunite('o1', 'publiee')
    const [eventKey, ctx] = mockEmit.mock.calls[0]
    expect(eventKey).toBe('opportunite.approved')
    expect(ctx.recipients[0]).toMatchObject({ cjsUid: 'r1', role: 'recruteur' })
    expect(ctx.contenu).toContain('Stage agro')
  })

  it('émet opportunite.rejected avec le motif', async () => {
    await notifyRecruteurDecisionOpportunite('o1', 'archivee', 'hors périmètre jeunesse')
    const [eventKey, ctx] = mockEmit.mock.calls[0]
    expect(eventKey).toBe('opportunite.rejected')
    expect(ctx.contenu).toContain('hors périmètre jeunesse')
  })

  it('retombe sur le cjsUid de l’organisation sans recruteurUid', async () => {
    mockOppFind.mockResolvedValue({ titre: 'X', recruteurUid: null, org: { cjsUid: 'org1' } })
    await notifyRecruteurDecisionOpportunite('o1', 'publiee')
    expect(mockEmit.mock.calls[0][1].recipients[0].cjsUid).toBe('org1')
  })

  it('sans propriétaire → pas d’émission', async () => {
    mockOppFind.mockResolvedValue({ titre: 'X', recruteurUid: null, org: null })
    await notifyRecruteurDecisionOpportunite('o1', 'publiee')
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('fail-soft : erreur DB non propagée', async () => {
    mockOppFind.mockRejectedValue(new Error('db down'))
    await expect(notifyRecruteurDecisionOpportunite('o1', 'publiee')).resolves.toBeUndefined()
  })
})
