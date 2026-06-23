/**
 * @jest-environment node
 *
 * Tests du pipeline d'éval (GUIC-435, jalon C).
 * Vérifie : stratification, ignorance des sessions web sans texte, écriture des scores.
 */

const mockFindMany = jest.fn()
const mockCreate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agentLog: { findMany: (...a: unknown[]) => mockFindMany(...a) },
    yayeEvalScore: { create: (...a: unknown[]) => mockCreate(...a) },
  },
}))
const mockReconstruct = jest.fn()
jest.mock('@/lib/ia/metrics/transcript', () => ({ reconstructTranscript: (...a: unknown[]) => mockReconstruct(...a) }))
const mockJudge = jest.fn()
jest.mock('@/lib/ia/metrics/judge', () => ({ judgeTranscript: (...a: unknown[]) => mockJudge(...a) }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { runEval } from '@/lib/ia/metrics/eval-run'

beforeEach(() => {
  mockFindMany.mockReset()
  mockCreate.mockReset()
  mockReconstruct.mockReset()
  mockJudge.mockReset()
})

test('juge les sessions WhatsApp, ignore le web sans texte, écrit les scores', async () => {
  mockFindMany.mockResolvedValueOnce([
    { sessionId: 'wa1', canal: 'whatsapp', typeEvenement: 'escalade_conseiller', statut: 'partiel' },
    { sessionId: 'web1', canal: 'web', typeEvenement: 'message_recu', statut: 'succes' },
  ])
  mockReconstruct.mockImplementation((id: string) =>
    Promise.resolve({ sessionId: id, hasVerbatimText: id === 'wa1', turns: [] }),
  )
  mockJudge.mockResolvedValue({
    juge: 'groq:test@rubric-v1',
    fidelite: 0.4,
    pertinence: 0.8,
    utilite: 0.7,
    persona: 0.9,
    conformiteCdp: 0.9,
    langue: 1,
    drapeauRouge: true,
    commentaire: 'ok',
  })
  mockCreate.mockResolvedValue({})

  const report = await runEval({ from: new Date('2026-06-21'), to: new Date('2026-06-22') })

  expect(report.candidats).toBe(2)
  expect(report.evalues).toBe(1)
  expect(report.ignoresSansTexte).toBe(1)
  expect(report.drapeauxRouges).toBe(1)
  expect(report.erreurs).toBe(0)
  expect(mockCreate).toHaveBeenCalledTimes(1)
  const data = (mockCreate.mock.calls[0][0] as { data: Record<string, unknown> }).data
  expect(data.sessionId).toBe('wa1')
  expect(data.drapeauRouge).toBe(true)
})

test('score juge null (échec LLM) → compté en erreur, pas d’écriture', async () => {
  mockFindMany.mockResolvedValueOnce([
    { sessionId: 'wa1', canal: 'whatsapp', typeEvenement: 'message_recu', statut: 'succes' },
  ])
  mockReconstruct.mockResolvedValue({ sessionId: 'wa1', hasVerbatimText: true, turns: [] })
  mockJudge.mockResolvedValueOnce(null)

  const report = await runEval({ from: new Date('2026-06-21'), to: new Date('2026-06-22') })
  expect(report.evalues).toBe(0)
  expect(report.erreurs).toBe(1)
  expect(mockCreate).not.toHaveBeenCalled()
})
