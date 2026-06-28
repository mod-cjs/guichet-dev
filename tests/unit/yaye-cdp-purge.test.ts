/**
 * @jest-environment node
 *
 * Droit à l'oubli Yaye (Lot 8, GUIC-259) : purgeYayeUserData efface toutes les
 * tables Yaye (par cjs_uid + par sessionId pour yaye_eval_scores) ET la mémoire Redis.
 */

const mockAgentLogFind = jest.fn()
const mockTurnFind = jest.fn()
const mockTransaction = jest.fn()

jest.mock('@/lib/prisma', () => {
  const del = () => jest.fn().mockResolvedValue({ count: 1 })
  return {
    prisma: {
      agentLog: { findMany: (...a: unknown[]) => mockAgentLogFind(...a), deleteMany: del() },
      yayeTranscriptTurn: { findMany: (...a: unknown[]) => mockTurnFind(...a), deleteMany: del() },
      recommandationIA: { deleteMany: del() },
      escaladeYaye: { deleteMany: del() },
      yayeFeedback: { deleteMany: del() },
      yayeSessionSummary: { deleteMany: del() },
      yayeEvalScore: { deleteMany: del() },
      $transaction: (ops: Promise<unknown>[]) => mockTransaction(ops),
    },
  }
})

const mockPurgeCtx = jest.fn()
const mockPurgeSummary = jest.fn()
jest.mock('@/lib/ia/context', () => ({ purgeUserContext: (...a: unknown[]) => mockPurgeCtx(...a) }))
jest.mock('@/lib/ia/memory', () => ({ purgeSummary: (...a: unknown[]) => mockPurgeSummary(...a) }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { purgeYayeUserData } from '@/lib/ia/cdp-purge'

beforeEach(() => {
  jest.clearAllMocks()
  mockTransaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
  mockPurgeCtx.mockResolvedValue(undefined)
  mockPurgeSummary.mockResolvedValue(undefined)
})

it('collecte les sessions (agent_logs + transcripts, dédupliquées) et purge tout', async () => {
  mockAgentLogFind.mockResolvedValue([{ sessionId: 's1' }, { sessionId: 's2' }])
  mockTurnFind.mockResolvedValue([{ sessionId: 's2' }, { sessionId: 's3' }])

  const res = await purgeYayeUserData('user-1')

  // 3 sessions uniques (s1, s2, s3).
  expect(res.sessions).toBe(3)
  // La transaction de suppression a bien été lancée.
  expect(mockTransaction).toHaveBeenCalledTimes(1)
  // Mémoire Redis purgée (contexte + fiche long terme).
  expect(mockPurgeCtx).toHaveBeenCalledWith('user-1')
  expect(mockPurgeSummary).toHaveBeenCalledWith('user-1')
  // Les compteurs agrègent les suppressions par cjs_uid ET par sessionId.
  expect(res.escalades).toBeGreaterThanOrEqual(1)
  expect(res.evalScores).toBe(1)
})

it("fonctionne même sans aucune session (in: [] no-op)", async () => {
  mockAgentLogFind.mockResolvedValue([])
  mockTurnFind.mockResolvedValue([])

  const res = await purgeYayeUserData('user-2')

  expect(res.sessions).toBe(0)
  expect(mockTransaction).toHaveBeenCalledTimes(1)
  expect(mockPurgeCtx).toHaveBeenCalledWith('user-2')
})
