/**
 * @jest-environment node
 *
 * Test du wiring entretien.annule / entretien.termine → bénéficiaire (GUIC-547).
 */
const mockEntFind = jest.fn()
const mockUserFind = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    entretien: { findUnique: (...a: unknown[]) => mockEntFind(...a) },
    utilisateur: { findUnique: (...a: unknown[]) => mockUserFind(...a) },
  },
}))

const mockEmit = jest.fn()
jest.mock('@/lib/notifications/emit', () => ({ emitEvent: (...a: unknown[]) => mockEmit(...a) }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { notifyEntretienStatut } from '@/lib/notifications/entretien-statut'

beforeEach(() => {
  jest.clearAllMocks()
  mockEntFind.mockResolvedValue({ candidatUid: 'j1', dateHeure: new Date('2026-08-01T10:00:00Z') })
  mockUserFind.mockResolvedValue({ prenom: 'Awa', telephone: '+221770000000', email: 'awa@example.com' })
  mockEmit.mockResolvedValue(undefined)
})

describe('notifyEntretienStatut', () => {
  it('émet entretien.annule vers le candidat avec ses coordonnées', async () => {
    await notifyEntretienStatut('e1', 'Annule')
    expect(mockEmit).toHaveBeenCalledTimes(1)
    const [eventKey, ctx] = mockEmit.mock.calls[0]
    expect(eventKey).toBe('entretien.annule')
    expect(ctx.recipients[0]).toMatchObject({ cjsUid: 'j1', role: 'beneficiaire', telephone: '+221770000000' })
    expect(ctx.titre).toMatch(/annulé/i)
  })

  it('émet entretien.termine avec entityId par transition', async () => {
    await notifyEntretienStatut('e1', 'Termine')
    const [eventKey, ctx] = mockEmit.mock.calls[0]
    expect(eventKey).toBe('entretien.termine')
    expect(ctx.entityId).toBe('e1:Termine')
  })

  it('entretien introuvable → pas d’émission', async () => {
    mockEntFind.mockResolvedValue(null)
    await notifyEntretienStatut('e1', 'Annule')
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('fail-soft : erreur DB non propagée', async () => {
    mockEntFind.mockRejectedValue(new Error('db down'))
    await expect(notifyEntretienStatut('e1', 'Annule')).resolves.toBeUndefined()
  })
})
