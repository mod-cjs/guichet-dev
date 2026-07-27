/**
 * @jest-environment node
 *
 * Tests de la route cron de reprojection Neo4j (GUIC-279).
 * Auth CRON_SECRET + délégation à reprojectAll.
 */
import type { NextRequest } from 'next/server'

const mockReproject = jest.fn()
jest.mock('@/lib/ia/graph/projection/project', () => ({ reprojectAll: (...a: unknown[]) => mockReproject(...a) }))

// Préchauffage des vecteurs du catalogue (GUIC-683) : mocké ici — cette suite teste
// l'authentification et la délégation, pas la vectorisation (qui a sa propre suite).
const mockWarmup = jest.fn(async () => ({ candidats: 12, uniques: 12, vecteurs: 12, complet: true, dureeMs: 3 }))
const mockWarmSkills = jest.fn(async () => 114)
jest.mock('@/lib/ia/search-warmup', () => ({
  warmOpportuniteVectors: () => mockWarmup(),
  warmSkillVectors: () => mockWarmSkills(),
}))

import { GET } from '@/app/api/cron/yaye-graph-sync/route'

const req = (auth?: string) =>
  ({ headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? auth ?? null : null) } }) as unknown as NextRequest

const OLD_ENV = process.env.CRON_SECRET
beforeEach(() => {
  mockReproject.mockReset()
  mockWarmup.mockClear()
  mockWarmSkills.mockClear()
  process.env.CRON_SECRET = 'sekret'
})
afterAll(() => { process.env.CRON_SECRET = OLD_ENV })

test('401 sans header Authorization', async () => {
  const res = await GET(req())
  expect(res.status).toBe(401)
  expect(mockReproject).not.toHaveBeenCalled()
})

test('401 si secret invalide', async () => {
  const res = await GET(req('Bearer mauvais'))
  expect(res.status).toBe(401)
})

test('200 + rapport si secret valide', async () => {
  mockReproject.mockResolvedValueOnce({ backend: 'neo4j', durationMs: 12, nodes: { Opportunite: 3 }, relations: { REQUIERT: 5 } })
  const res = await GET(req('Bearer sekret'))
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.data).toMatchObject({ backend: 'neo4j' })
  expect(mockReproject).toHaveBeenCalledWith({ wipe: true })
  // Le catalogue est vectorisé DANS le cron — jamais sur le chemin de réponse.
  expect(mockWarmup).toHaveBeenCalled()
  expect(body.data.warmup).toMatchObject({ vecteurs: 12, competences: 114 })
  // Le référentiel de compétences sert le chemin de RÉPONSE, qui ne vectorise plus
  // rien à chaud : il doit donc être préchauffé ici (vague 2.2).
  expect(mockWarmSkills).toHaveBeenCalled()
})

test('500 si la reprojection échoue', async () => {
  mockReproject.mockRejectedValueOnce(new Error('boom'))
  const res = await GET(req('Bearer sekret'))
  expect(res.status).toBe(500)
})
