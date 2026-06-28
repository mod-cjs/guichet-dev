/**
 * @jest-environment node
 *
 * Alimentation garde anti-régression (GUIC-435 jalon E) : runRegressionGuard
 * initialise la baseline au 1er run puis compare ; peekRegression ne l'écrit jamais.
 */

const mockGet = jest.fn()
const mockSet = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: { get: (...a: unknown[]) => mockGet(...a), set: (...a: unknown[]) => mockSet(...a) },
}))

const mockYqsGlobal = jest.fn()
jest.mock('@/lib/ia/metrics/yqs', () => ({ computeYqsGlobal: (...a: unknown[]) => mockYqsGlobal(...a) }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { runRegressionGuard, peekRegression } from '@/lib/ia/metrics/regression-data'

beforeEach(() => {
  jest.clearAllMocks()
  mockSet.mockResolvedValue('OK')
  mockGet.mockResolvedValue(null) // pas de baseline ni de golden par défaut
  mockYqsGlobal.mockResolvedValue({ yqs: 80, qualite: { fidelite: 0.9, conformiteCdp: 0.9 } })
})

it('1er run : initialise la baseline et ne compare pas', async () => {
  const rep = await runRegressionGuard()
  expect(rep.baselineInitialisee).toBe(true)
  expect(rep.result).toBeNull()
  expect(mockSet).toHaveBeenCalledTimes(1) // baseline figée
})

it('run suivant : compare et détecte une chute de YQS', async () => {
  // Baseline existante (YQS 80) renvoyée par redis.get(baseline), null pour golden.
  mockGet.mockImplementation((key: string) =>
    key.includes('baseline')
      ? Promise.resolve(JSON.stringify({ yqs: 80, fidelite: 0.9, conformiteCdp: 0.9, intentPrecision: null, calculeLe: '2026-06-01' }))
      : Promise.resolve(null),
  )
  // Snapshot courant dégradé (YQS 60 → chute de 20 pts > seuil 5).
  mockYqsGlobal.mockResolvedValue({ yqs: 60, qualite: { fidelite: 0.9, conformiteCdp: 0.9 } })

  const rep = await runRegressionGuard()
  expect(rep.baselineInitialisee).toBe(false)
  expect(rep.result?.regressed).toBe(true)
  expect(mockSet).not.toHaveBeenCalled() // baseline non réécrite
})

it('peekRegression ne modifie jamais la baseline', async () => {
  mockGet.mockImplementation((key: string) =>
    key.includes('baseline')
      ? Promise.resolve(JSON.stringify({ yqs: 80, fidelite: 0.9, conformiteCdp: 0.9, intentPrecision: null, calculeLe: '2026-06-01' }))
      : Promise.resolve(null),
  )
  const rep = await peekRegression()
  expect(rep.result).not.toBeNull()
  expect(mockSet).not.toHaveBeenCalled()
})
