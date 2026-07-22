/**
 * @jest-environment node
 *
 * Test du wiring candidature.statut_change → bénéficiaire (GUIC-548).
 */
const mockFindUnique = jest.fn()
jest.mock('@/lib/prisma', () => ({ prisma: { candidature: { findUnique: (...a: unknown[]) => mockFindUnique(...a) } } }))

const mockEmit = jest.fn()
jest.mock('@/lib/notifications/emit', () => ({ emitEvent: (...a: unknown[]) => mockEmit(...a) }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { notifyCandidatStatutChange } from '@/lib/notifications/candidature-statut'

const CAND = {
  cjsUid: 'j1',
  utilisateur: { prenom: 'Awa', telephone: '+221770000000', email: 'awa@example.com' },
  opportunite: { titre: 'Stage agronomie' },
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFindUnique.mockResolvedValue(CAND)
  mockEmit.mockResolvedValue(undefined)
})

describe('notifyCandidatStatutChange', () => {
  it('émet candidature.statut_change vers le bénéficiaire (role + coordonnées)', async () => {
    await notifyCandidatStatutChange('c1', 'Retenue')
    expect(mockEmit).toHaveBeenCalledTimes(1)
    const [eventKey, ctx] = mockEmit.mock.calls[0]
    expect(eventKey).toBe('candidature.statut_change')
    expect(ctx.recipients[0]).toMatchObject({ cjsUid: 'j1', role: 'beneficiaire', telephone: '+221770000000', email: 'awa@example.com' })
    expect(ctx.type).toBe('Candidature')
    expect(ctx.contenu).toContain('Stage agronomie')
  })

  it('inclut le statut dans entityId (idempotence par transition)', async () => {
    await notifyCandidatStatutChange('c1', 'Retenue')
    expect(mockEmit.mock.calls[0][1].entityId).toBe('c1:Retenue')
  })

  it('copy distincte selon le statut', async () => {
    await notifyCandidatStatutChange('c1', 'Refusee')
    expect(mockEmit.mock.calls[0][1].titre).toMatch(/non retenue/i)
  })

  it('statut hors {Vue,Retenue,Refusee} → pas d’émission', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await notifyCandidatStatutChange('c1', 'En_attente' as any)
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('candidature introuvable → pas d’émission', async () => {
    mockFindUnique.mockResolvedValue(null)
    await notifyCandidatStatutChange('c1', 'Retenue')
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('fail-soft : une erreur DB ne propage pas', async () => {
    mockFindUnique.mockRejectedValue(new Error('db down'))
    await expect(notifyCandidatStatutChange('c1', 'Retenue')).resolves.toBeUndefined()
    expect(mockEmit).not.toHaveBeenCalled()
  })
})
