/**
 * @jest-environment node
 *
 * Alimentation calibration juge↔humain (GUIC-435 R2) : computeCalibration apparie
 * les labels humains (juge "humain:…") aux scores Groq de la même (session, tour).
 */

const mockFindMany = jest.fn()
const mockCreate = jest.fn()
const mockDeleteMany = jest.fn()
const mockTransaction = jest.fn((ops: unknown[]) => Promise.all(ops))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    yayeEvalScore: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      create: (...a: unknown[]) => mockCreate(...a),
      deleteMany: (...a: unknown[]) => mockDeleteMany(...a),
    },
    $transaction: (ops: unknown[]) => mockTransaction(ops),
  },
}))

import { computeCalibration, recordHumanLabel } from '@/lib/ia/metrics/calibration-data'

const dims = (v: number) => ({
  fidelite: v, pertinence: v, utilite: v, persona: v, conformiteCdp: v, langue: v,
})

beforeEach(() => jest.clearAllMocks())

it('renvoie null tant qu\'aucune session n\'est doublement notée', async () => {
  mockFindMany.mockResolvedValue([
    { sessionId: 's1', tourIndex: null, juge: 'groq:llama@rubric-v4', ...dims(0.9) },
  ])
  expect(await computeCalibration()).toBeNull()
})

it('apparie humain↔juge et calcule le kappa par dimension', async () => {
  mockFindMany.mockResolvedValue([
    // s1 : accord parfait
    { sessionId: 's1', tourIndex: null, juge: 'groq:llama@rubric-v4', ...dims(0.9) },
    { sessionId: 's1', tourIndex: null, juge: 'humain:conseiller-a@rubric-v4', ...dims(0.9) },
    // s2 : accord parfait
    { sessionId: 's2', tourIndex: null, juge: 'groq:llama@rubric-v4', ...dims(0.2) },
    { sessionId: 's2', tourIndex: null, juge: 'humain:conseiller-a@rubric-v4', ...dims(0.2) },
    // s3 : juge seul → ignoré (pas de paire)
    { sessionId: 's3', tourIndex: null, juge: 'groq:llama@rubric-v4', ...dims(0.5) },
  ])

  const report = await computeCalibration()
  expect(report).not.toBeNull()
  expect(report!.pairs).toBe(2)
  // Accord parfait sur des bins identiques → kappa = 1 par dimension.
  expect(report!.parDimension.fidelite).toBe(1)
  expect(report!.global).toBe(1)
})

it('recordHumanLabel remplace le label du même notateur (dédup) et lève le drapeau', async () => {
  mockCreate.mockResolvedValue({})
  mockDeleteMany.mockResolvedValue({ count: 1 })
  await recordHumanLabel({
    sessionId: 's1',
    raterCjsUid: 'admin-1',
    scores: { fidelite: 0.3, pertinence: 0.8, utilite: 0.8, persona: 0.8, conformiteCdp: 0.9, langue: 0.9 },
    commentaire: 'a inventé une offre',
  })
  // Supprime d'abord l'éventuel label précédent du même (session, notateur).
  expect(mockDeleteMany.mock.calls[0][0].where).toMatchObject({ sessionId: 's1' })
  expect(mockDeleteMany.mock.calls[0][0].where.juge).toMatch(/^humain:admin-1@/)
  const data = mockCreate.mock.calls[0][0].data
  expect(data.juge).toMatch(/^humain:admin-1@/)
  expect(data.drapeauRouge).toBe(true) // fidelite 0.3 < 0.6
  expect(data.commentaire).toBe('a inventé une offre')
})
