/**
 * @jest-environment node
 *
 * Tests de la matérialisation des métriques par session (GUIC-435, jalon F).
 */

const mockAgentFind = jest.fn()
const mockEvalFirst = jest.fn()
const mockFbFind = jest.fn()
const mockUpsert = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agentLog: { findMany: (...a: unknown[]) => mockAgentFind(...a) },
    yayeEvalScore: { findFirst: (...a: unknown[]) => mockEvalFirst(...a) },
    yayeFeedback: { findMany: (...a: unknown[]) => mockFbFind(...a) },
    yayeSessionSummary: { upsert: (...a: unknown[]) => mockUpsert(...a) },
  },
}))
const mockReconstruct = jest.fn()
jest.mock('@/lib/ia/metrics/transcript', () => ({ reconstructTranscript: (...a: unknown[]) => mockReconstruct(...a) }))

import { materializeSummaries } from '@/lib/ia/metrics/materialize'

beforeEach(() => {
  mockAgentFind.mockReset()
  mockEvalFirst.mockReset()
  mockFbFind.mockReset()
  mockUpsert.mockReset()
  mockReconstruct.mockReset()
})

test('écrit un résumé par session avec YQS, converti et drapeau rouge', async () => {
  mockAgentFind.mockResolvedValueOnce([{ sessionId: 's1' }])
  mockReconstruct.mockResolvedValueOnce({
    sessionId: 's1',
    canal: 'web',
    cjsUid: 'uid',
    centreId: null,
    nbTours: 1,
    dureeMs: 2000,
    escalade: false,
    turns: [{ toolsUsed: ['submit_application'], intentions: ['submit_application'] }],
    events: [
      { type: 'api_appelee', statut: 'succes', toolCalled: 'submit_application' },
      { type: 'reponse_generee', statut: 'succes', toolCalled: null },
    ],
  })
  mockEvalFirst.mockResolvedValueOnce({
    fidelite: 0.2, // < seuil → drapeau rouge
    pertinence: 0.8,
    utilite: 0.8,
    persona: 0.8,
    conformiteCdp: 0.9,
    langue: 1,
  })
  mockFbFind.mockResolvedValueOnce([{ note: 1 }])
  mockUpsert.mockResolvedValue({})

  const report = await materializeSummaries({})

  expect(report.sessions).toBe(1)
  expect(report.ecrits).toBe(1)
  expect(report.drapeauxRouges).toBe(1)
  const arg = mockUpsert.mock.calls[0][0] as { create: Record<string, unknown> }
  expect(arg.create.converti).toBe(true) // submit_application réussi
  expect(arg.create.drapeauRouge).toBe(true) // fidélité sous seuil
  expect(arg.create.intentionPrinc).toBe('submit_application')
})

test('ignore une session sans canal (aucun log exploitable)', async () => {
  mockAgentFind.mockResolvedValueOnce([{ sessionId: 'vide' }])
  mockReconstruct.mockResolvedValueOnce({ canal: null, turns: [], events: [] })
  const report = await materializeSummaries({})
  expect(report.ecrits).toBe(0)
  expect(mockUpsert).not.toHaveBeenCalled()
})
