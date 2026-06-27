/**
 * @jest-environment node
 *
 * Escalade Yaye → opérateur humain (GUIC-259, Lot 6).
 * Vérifie : trace event + file + notification staff, dédoublon par session, fail-soft.
 */

const mockLogEvent = jest.fn()
jest.mock('@/lib/ia/agent-logs', () => ({ logAgentEvent: (...a: unknown[]) => mockLogEvent(...a) }))

const mockFindFirst = jest.fn()
const mockCreate = jest.fn()
const mockAgentCentreFindMany = jest.fn()
const mockNotifCreateMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    escaladeYaye: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      create: (...a: unknown[]) => mockCreate(...a),
    },
    agentCentre: { findMany: (...a: unknown[]) => mockAgentCentreFindMany(...a) },
    notification: { createMany: (...a: unknown[]) => mockNotifCreateMany(...a) },
  },
}))

import { recordEscalade, escaladeReference } from '@/lib/ia/escalade'

const base = {
  sessionId: 's-1', cjsUid: 'u-1', role: 'beneficiaire',
  centreId: null, canal: 'web' as const, raison: 'sujet_sensible',
}

beforeEach(() => {
  mockLogEvent.mockReset()
  mockFindFirst.mockReset()
  mockCreate.mockReset()
  mockAgentCentreFindMany.mockReset()
  mockNotifCreateMany.mockReset()
})

test('escaladeReference : référence YAYE- stable dérivée du sessionId', () => {
  expect(escaladeReference('s-1')).toMatch(/^YAYE-/)
  expect(escaladeReference('abc-123456')).toBe(escaladeReference('abc-123456')) // stable
})

test('nouvelle escalade : trace event + file + notifie + renvoie référence (alreadyPending=false)', async () => {
  mockFindFirst.mockResolvedValueOnce(null)
  mockCreate.mockResolvedValueOnce({ id: 'e1' })
  mockAgentCentreFindMany.mockResolvedValueOnce([{ cjsUid: 'c1' }, { cjsUid: 'c2' }])
  mockNotifCreateMany.mockResolvedValueOnce({ count: 2 })

  const r = await recordEscalade(base)
  expect(r).toEqual({ reference: escaladeReference('s-1'), alreadyPending: false })

  expect(mockLogEvent).toHaveBeenCalledWith(
    expect.objectContaining({ typeEvenement: 'escalade_conseiller', sessionId: 's-1' }),
  )
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ sessionId: 's-1', raison: 'sujet_sensible' }) }),
  )
  // Cible le pool conseiller + directeur, dédupliqué.
  expect(mockAgentCentreFindMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { role: { in: ['conseiller', 'directeur'] } }, distinct: ['cjsUid'] }),
  )
  const arg = mockNotifCreateMany.mock.calls[0][0]
  expect(arg.data).toHaveLength(2)
  expect(arg.data[0]).toEqual(expect.objectContaining({ cjsUid: 'c1', type: 'Yaye', lien: '/admin/yaye/escalades' }))
})

test('signal de danger : raison taguée DANGER + notif urgente + trace du signal', async () => {
  mockFindFirst.mockResolvedValueOnce(null)
  mockCreate.mockResolvedValueOnce({ id: 'e1' })
  mockAgentCentreFindMany.mockResolvedValueOnce([{ cjsUid: 'c1' }])
  mockNotifCreateMany.mockResolvedValueOnce({ count: 1 })

  await recordEscalade({ ...base, raison: 'sujet_sensible', dangerSignal: 'violence' })

  // Phase 2 : catégorie en colonne dédiée + priorité de file (danger en haut).
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ raison: 'sujet_sensible', signalDanger: 'violence', priorite: 1 }),
    }),
  )
  // Notification URGENTE distincte.
  const notif = mockNotifCreateMany.mock.calls[0][0].data[0]
  expect(notif.titre).toMatch(/danger.*violence/i)
  expect(notif.metaPill).toBe('Danger')
  expect(notif.contenu).toMatch(/URGENT/)
  // La trace event porte le signal (métriques / transcript).
  expect(mockLogEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      typeEvenement: 'escalade_conseiller',
      payload: expect.objectContaining({ dangerSignal: 'violence' }),
    }),
  )
})

test('escalade déjà en file : pas de doublon, alreadyPending=true (mais trace écrite)', async () => {
  mockFindFirst.mockResolvedValueOnce({ id: 'existing' })

  const r = await recordEscalade(base)
  expect(r).toEqual({ reference: escaladeReference('s-1'), alreadyPending: true })

  expect(mockLogEvent).toHaveBeenCalled() // la trace technique reste écrite à chaque fois
  expect(mockCreate).not.toHaveBeenCalled()
  expect(mockNotifCreateMany).not.toHaveBeenCalled()
})

test('aucun staff : pas de createMany, pas de crash', async () => {
  mockFindFirst.mockResolvedValueOnce(null)
  mockCreate.mockResolvedValueOnce({ id: 'e1' })
  mockAgentCentreFindMany.mockResolvedValueOnce([])

  await recordEscalade(base)

  expect(mockNotifCreateMany).not.toHaveBeenCalled()
})

test('échec d’écriture file : fail-soft, renvoie quand même la référence', async () => {
  mockFindFirst.mockRejectedValueOnce(new Error('db down'))
  await expect(recordEscalade(base)).resolves.toEqual({
    reference: escaladeReference('s-1'),
    alreadyPending: false,
  })
})

test('échec de notification : fail-soft, l’escalade reste enregistrée', async () => {
  mockFindFirst.mockResolvedValueOnce(null)
  mockCreate.mockResolvedValueOnce({ id: 'e1' })
  mockAgentCentreFindMany.mockResolvedValueOnce([{ cjsUid: 'c1' }])
  mockNotifCreateMany.mockRejectedValueOnce(new Error('FK violation'))

  await expect(recordEscalade(base)).resolves.toEqual(
    expect.objectContaining({ alreadyPending: false }),
  )
  expect(mockCreate).toHaveBeenCalled()
})
