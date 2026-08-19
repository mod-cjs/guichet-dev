/**
 * @jest-environment node
 *
 * Tests des rappels planifiés (GUIC-547) : fenêtre J-1, émissions par volet, isolation des échecs.
 */
const mockResaFind = jest.fn()
const mockEntFind = jest.fn()
const mockUserFind = jest.fn()
const mockInscFind = jest.fn()
const mockEmpruntFind = jest.fn()
const mockEscaladeFind = jest.fn()
const mockAgentCentreFind = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    reservation: { findMany: (...a: unknown[]) => mockResaFind(...a) },
    entretien: { findMany: (...a: unknown[]) => mockEntFind(...a) },
    utilisateur: { findMany: (...a: unknown[]) => mockUserFind(...a) },
    inscriptionEvenement: { findMany: (...a: unknown[]) => mockInscFind(...a) },
    emprunt: { findMany: (...a: unknown[]) => mockEmpruntFind(...a) },
    escaladeYaye: { findMany: (...a: unknown[]) => mockEscaladeFind(...a) },
    agentCentre: { findMany: (...a: unknown[]) => mockAgentCentreFind(...a) },
  },
}))

const mockEmit = jest.fn()
jest.mock('@/lib/notifications/emit', () => ({ emitEvent: (...a: unknown[]) => mockEmit(...a) }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { runNotificationReminders, tomorrowWindow } from '@/lib/notifications/reminders'

const NOW = new Date('2026-07-22T12:00:00')
const COORDS = { prenom: 'Awa', telephone: '+221770000000', email: 'a@x.sn' }

beforeEach(() => {
  jest.clearAllMocks()
  mockResaFind.mockResolvedValue([])
  mockEntFind.mockResolvedValue([])
  mockUserFind.mockResolvedValue([])
  mockInscFind.mockResolvedValue([])
  mockEmpruntFind.mockResolvedValue([])
  mockEscaladeFind.mockResolvedValue([])
  mockAgentCentreFind.mockResolvedValue([])
  mockEmit.mockResolvedValue(undefined)
})

describe('GUIC-259 — re-alerte escalade SLA dépassé', () => {
  it('émet yaye.escalade_sla_depassee au pool conseiller pour chaque escalade en retard SLA', async () => {
    mockEscaladeFind.mockResolvedValue([{ id: 'esc-1' }])
    mockAgentCentreFind.mockResolvedValue([{ cjsUid: 'cons-1' }])
    mockUserFind.mockResolvedValue([{ cjsUid: 'cons-1', ...COORDS }])

    const summary = await runNotificationReminders(NOW)

    expect(summary.escaladesSlaDepassee).toBe(1)
    const call = mockEmit.mock.calls.find((c) => c[0] === 'yaye.escalade_sla_depassee')
    expect(call).toBeDefined()
    expect(call![1].entityId).toBe('esc-1')
    expect(call![1].recipients.map((r: { role: string }) => r.role)).toEqual(['conseiller'])
  })

  it('aucune escalade en retard → aucune émission', async () => {
    mockEscaladeFind.mockResolvedValue([])
    const summary = await runNotificationReminders(NOW)
    expect(summary.escaladesSlaDepassee).toBe(0)
    expect(mockEmit.mock.calls.find((c) => c[0] === 'yaye.escalade_sla_depassee')).toBeUndefined()
  })
})

describe('tomorrowWindow', () => {
  it('borne [00:00 J+1, 00:00 J+2)', () => {
    const { start, end } = tomorrowWindow(NOW)
    expect(start.getDate()).toBe(23)
    expect(start.getHours()).toBe(0)
    expect(end.getDate()).toBe(24)
  })
})

describe('runNotificationReminders', () => {
  it('émet reservation.reminder pour les réservations acceptées de demain', async () => {
    mockResaFind.mockResolvedValue([
      { id: 'r1', cjsUid: 'j1', creneauDebut: '09:00', centre: { nom: 'Dakar' }, utilisateur: COORDS },
    ])
    const s = await runNotificationReminders(NOW)
    expect(mockResaFind.mock.calls[0][0].where.statut).toBe('Acceptee')
    const [eventKey, ctx] = mockEmit.mock.calls[0]
    expect(eventKey).toBe('reservation.reminder')
    expect(ctx.contenu).toContain('Dakar')
    expect(s.reservations).toBe(1)
  })

  it('émet entretien.reminder au candidat ET au recruteur', async () => {
    mockEntFind.mockResolvedValue([
      { id: 'e1', candidatUid: 'j1', recruteurUid: 'r1', dateHeure: new Date('2026-07-23T10:00:00'), mode: 'Visio' },
    ])
    mockUserFind.mockResolvedValue([
      { cjsUid: 'j1', ...COORDS },
      { cjsUid: 'r1', prenom: 'Moussa', telephone: null, email: 'm@org.sn' },
    ])
    await runNotificationReminders(NOW)
    const call = mockEmit.mock.calls.find((c) => c[0] === 'entretien.reminder')!
    expect(call[1].recipients.map((r: { role: string }) => r.role).sort()).toEqual(['beneficiaire', 'recruteur'])
  })

  it('émet evenement.reminder pour les inscrits aux événements de demain', async () => {
    mockInscFind.mockResolvedValue([
      { evenementId: 'ev1', cjsUid: 'j1', evenement: { titre: 'Forum emploi', dateDebut: new Date('2026-07-23T09:00:00') }, utilisateur: COORDS },
    ])
    await runNotificationReminders(NOW)
    const call = mockEmit.mock.calls.find((c) => c[0] === 'evenement.reminder')!
    expect(call[1].contenu).toContain('Forum emploi')
  })

  it('émet emprunt.en_retard pour les emprunts non rendus en dépassement', async () => {
    mockEmpruntFind.mockResolvedValue([{ id: 'em1', cjsUid: 'j1', utilisateur: COORDS }])
    const s = await runNotificationReminders(NOW)
    expect(mockEmit.mock.calls.some((c) => c[0] === 'emprunt.en_retard')).toBe(true)
    expect(s.empruntsEnRetard).toBe(1)
  })

  it('un volet en échec n’empêche pas les autres', async () => {
    mockResaFind.mockRejectedValue(new Error('db down'))
    mockEmpruntFind.mockResolvedValue([{ id: 'em1', cjsUid: 'j1', utilisateur: COORDS }])
    const s = await runNotificationReminders(NOW)
    expect(s.reservations).toBe(0)
    expect(s.empruntsEnRetard).toBe(1)
  })
})
