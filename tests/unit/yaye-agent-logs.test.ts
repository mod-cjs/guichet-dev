/**
 * @jest-environment node
 *
 * Tests du journaliseur agent_logs (GUIC-259, Lot 0).
 * Invariant clé : FAIL-SOFT — une erreur d'écriture ne doit jamais throw.
 */

const mockCreate = jest.fn()
jest.mock('@/lib/prisma', () => ({ prisma: { agentLog: { create: (...a: unknown[]) => mockCreate(...a) } } }))

const mockWarn = jest.fn()
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: (...a: unknown[]) => mockWarn(...a), error: jest.fn() } }))

import { logAgentEvent } from '@/lib/ia/agent-logs'

beforeEach(() => {
  mockCreate.mockReset()
  mockWarn.mockReset()
})

test('écrit l’événement (tsMs bigint, statut succès par défaut)', async () => {
  mockCreate.mockResolvedValueOnce({})
  await logAgentEvent({ sessionId: 's', canal: 'web', typeEvenement: 'message_recu', payload: { longueur: 5 } })

  expect(mockCreate).toHaveBeenCalledTimes(1)
  const data = (mockCreate.mock.calls[0][0] as { data: Record<string, unknown> }).data
  expect(data.canal).toBe('web')
  expect(data.typeEvenement).toBe('message_recu')
  expect(typeof data.tsMs).toBe('bigint')
  expect(data.statut).toBe('succes')
})

test('FAIL-SOFT : ne throw pas si Prisma échoue, log un warning', async () => {
  mockCreate.mockRejectedValueOnce(new Error('db down'))
  await expect(
    logAgentEvent({ sessionId: 's', canal: 'web', typeEvenement: 'erreur', statut: 'echec' }),
  ).resolves.toBeUndefined()
  expect(mockWarn).toHaveBeenCalled()
})
