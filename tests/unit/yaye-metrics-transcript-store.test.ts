/**
 * @jest-environment node
 *
 * Tests de la capture durable du transcript web (GUIC-435, option A).
 * Vérifie : flag d'env (opt-in), pseudonymisation avant écriture, fail-soft.
 */

const mockCreate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { yayeTranscriptTurn: { create: (...a: unknown[]) => mockCreate(...a) } },
}))
const mockWarn = jest.fn()
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: (...a: unknown[]) => mockWarn(...a), error: jest.fn() } }))

import { recordWebTurn, isWebTranscriptEnabled } from '@/lib/ia/metrics/transcript-store'

const OLD = process.env.YAYE_PERSIST_WEB_TRANSCRIPT
beforeEach(() => {
  mockCreate.mockReset()
  mockWarn.mockReset()
})
afterAll(() => {
  process.env.YAYE_PERSIST_WEB_TRANSCRIPT = OLD
})

test('flag OFF (défaut) : no-op, aucune écriture', async () => {
  delete process.env.YAYE_PERSIST_WEB_TRANSCRIPT
  expect(isWebTranscriptEnabled()).toBe(false)
  await recordWebTurn({ sessionId: 's1', tourIndex: 0, userText: 'salut', assistantText: 'bonjour' })
  expect(mockCreate).not.toHaveBeenCalled()
})

test('flag ON : écrit le texte PSEUDONYMISÉ', async () => {
  process.env.YAYE_PERSIST_WEB_TRANSCRIPT = 'true'
  mockCreate.mockResolvedValueOnce({})
  await recordWebTurn({
    sessionId: 's1',
    cjsUid: 'uid',
    tourIndex: 1,
    userText: 'appelle-moi au +221770000000',
    assistantText: 'ok, mail a@b.com',
  })
  expect(mockCreate).toHaveBeenCalledTimes(1)
  const data = (mockCreate.mock.calls[0][0] as { data: Record<string, unknown> }).data
  expect(data.userText).toContain('[téléphone]')
  expect(data.userText).not.toContain('+221770000000')
  expect(data.assistantText).toContain('[email]')
})

test('flag ON mais Prisma échoue : FAIL-SOFT (ne throw pas, log un warning)', async () => {
  process.env.YAYE_PERSIST_WEB_TRANSCRIPT = 'true'
  mockCreate.mockRejectedValueOnce(new Error('db down'))
  await expect(
    recordWebTurn({ sessionId: 's1', tourIndex: 0, userText: 'a', assistantText: 'b' }),
  ).resolves.toBeUndefined()
  expect(mockWarn).toHaveBeenCalled()
})
