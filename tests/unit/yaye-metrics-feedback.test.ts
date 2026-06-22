/**
 * @jest-environment node
 *
 * Tests du feedback Yaye (GUIC-435, jalon B, couche 5).
 * Vérifie : écriture fail-soft, troncature raison, calcul CSAT.
 */

const mockCreate = jest.fn()
const mockCount = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { yayeFeedback: { create: (...a: unknown[]) => mockCreate(...a), count: (...a: unknown[]) => mockCount(...a) } },
}))
const mockWarn = jest.fn()
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: (...a: unknown[]) => mockWarn(...a), error: jest.fn() } }))

import { recordFeedback, computeFeedbackKpis } from '@/lib/ia/metrics/feedback'

beforeEach(() => {
  mockCreate.mockReset()
  mockCount.mockReset()
  mockWarn.mockReset()
})

test('recordFeedback écrit la note et tronque la raison à 2000 caractères', async () => {
  mockCreate.mockResolvedValueOnce({})
  const ok = await recordFeedback({
    sessionId: 's1',
    cjsUid: 'uid',
    canal: 'web',
    tourIndex: 2,
    note: 1,
    raison: 'x'.repeat(5000),
  })
  expect(ok).toBe(true)
  const data = (mockCreate.mock.calls[0][0] as { data: Record<string, unknown> }).data
  expect(data.note).toBe(1)
  expect((data.raison as string).length).toBe(2000)
})

test('recordFeedback est FAIL-SOFT : ne throw pas, retourne false, log un warning', async () => {
  mockCreate.mockRejectedValueOnce(new Error('db down'))
  await expect(
    recordFeedback({ sessionId: 's1', canal: 'whatsapp', note: -1 }),
  ).resolves.toBe(false)
  expect(mockWarn).toHaveBeenCalled()
})

test('computeFeedbackKpis calcule le CSAT', async () => {
  mockCount.mockResolvedValueOnce(8) // positifs
  mockCount.mockResolvedValueOnce(2) // negatifs
  const k = await computeFeedbackKpis({ canal: 'web' })
  expect(k.positifs).toBe(8)
  expect(k.negatifs).toBe(2)
  expect(k.total).toBe(10)
  expect(k.csat).toBeCloseTo(0.8, 5)
})

test('CSAT null si aucun feedback', async () => {
  mockCount.mockResolvedValueOnce(0)
  mockCount.mockResolvedValueOnce(0)
  const k = await computeFeedbackKpis()
  expect(k.total).toBe(0)
  expect(k.csat).toBeNull()
})
