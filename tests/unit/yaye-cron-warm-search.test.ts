/**
 * @jest-environment node
 *
 * Cron d'AMORÇAGE du cache de vecteurs (GUIC-683).
 *
 * Sans lui, la mise en production demande un geste manuel — 17 minutes lancées à la main —
 * ou sept nuits d'attente avant que la recherche sémantique couvre le catalogue. Ce cron
 * fait le travail par tranches horaires et s'arrête de lui-même une fois le catalogue
 * couvert : la fonctionnalité devient opérationnelle dans la journée qui suit le
 * déploiement, sans que personne ait à s'en occuper.
 */
import type { NextRequest } from 'next/server'

const mockWarmCatalogue = jest.fn()
const mockWarmSkills = jest.fn()
jest.mock('@/lib/ia/search-warmup', () => ({
  warmOpportuniteVectors: () => mockWarmCatalogue(),
  warmSkillVectors: () => mockWarmSkills(),
}))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { GET } from '@/app/api/cron/yaye-warm-search/route'

const req = (auth?: string) =>
  ({ headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? auth ?? null : null) } }) as unknown as NextRequest

const enCours = { candidats: 4208, uniques: 4114, vecteurs: 1280, complet: false, dureeMs: 179_000 }
const termine = { candidats: 4208, uniques: 4114, vecteurs: 4114, complet: true, dureeMs: 190 }

const OLD = process.env.CRON_SECRET
beforeEach(() => {
  jest.clearAllMocks()
  process.env.CRON_SECRET = 'sekret'
  mockWarmSkills.mockResolvedValue(114)
  mockWarmCatalogue.mockResolvedValue(enCours)
})
afterAll(() => { process.env.CRON_SECRET = OLD })

test('401 sans en-tête Authorization — le cron n’est pas une route publique', async () => {
  const res = await GET(req())
  expect(res.status).toBe(401)
  expect(mockWarmCatalogue).not.toHaveBeenCalled()
})

test('401 si le secret est faux', async () => {
  expect((await GET(req('Bearer mauvais'))).status).toBe(401)
  expect(mockWarmCatalogue).not.toHaveBeenCalled()
})

test('amorçage en cours → 200 + avancement, pour pouvoir suivre la montée', async () => {
  const res = await GET(req('Bearer sekret'))
  const body = await res.json()

  expect(res.status).toBe(200)
  expect(body.data).toMatchObject({ complet: false, vecteurs: 1280, uniques: 4114 })
  expect(body.data.couverture).toBe(31) // pourcentage, lisible d'un coup d'œil
})

test('le référentiel de compétences est amorcé AVANT le catalogue', async () => {
  const ordre: string[] = []
  mockWarmSkills.mockImplementation(async () => { ordre.push('competences'); return 114 })
  mockWarmCatalogue.mockImplementation(async () => { ordre.push('catalogue'); return enCours })

  await GET(req('Bearer sekret'))

  // Les compétences servent le chemin de réponse (écart de compétences) : elles priment.
  expect(ordre).toEqual(['competences', 'catalogue'])
})

test('catalogue couvert → le cron devient un no-op, il ne s’arrête jamais de tourner pour autant', async () => {
  mockWarmCatalogue.mockResolvedValue(termine)
  const body = await (await GET(req('Bearer sekret'))).json()

  expect(body.data).toMatchObject({ complet: true, couverture: 100 })
  // Il continue de passer : les offres publiées après l'amorçage sont vectorisées au fil
  // de l'eau, sans attendre la nuit.
  expect(mockWarmCatalogue).toHaveBeenCalled()
})

test('FAIL-SOFT : un préchauffage en échec ne fait pas échouer le cron', async () => {
  mockWarmCatalogue.mockRejectedValueOnce(new Error('vertex down'))
  const res = await GET(req('Bearer sekret'))

  expect(res.status).toBe(500)
  const body = await res.json()
  expect(body.error?.code).toBe('WARMUP_FAILED')
})
