/**
 * @jest-environment node
 *
 * Recherche GLOBALE (GUIC-676) — l'aperçu du marché. Emprunt ciblé au « Global Search »
 * de GraphRAG : répondre à une question thématique (« quels secteurs recrutent à Thiès ? »)
 * là où toutes les traversées existantes sont égocentrées.
 *
 * Le test le plus important de ce fichier est celui de l'invariant CDP : les agrégats
 * portent sur les OFFRES, jamais sur les personnes.
 */

const store = new Map<string, string>()
const mockGet = jest.fn(async (k: string) => (store.has(k) ? store.get(k)! : null))
const mockSet = jest.fn(async (k: string, v: string) => { store.set(k, v); return 'OK' })
jest.mock('@/lib/redis', () => ({
  redis: { get: (...a: [string]) => mockGet(...a), set: (...a: [string, string]) => mockSet(...a), del: jest.fn() },
}))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))

const apercuMarche = jest.fn()
jest.mock('@/lib/ia/graph', () => ({ getGraphPort: () => ({ apercuMarche }) }))

import {
  MARCHE_COMPETENCES,
  MARCHE_ORGANISATIONS,
  MARCHE_PAR_DOMAINE,
  MARCHE_PAR_REGION,
  MARCHE_PAR_TYPE,
} from '@/lib/ia/graph/cypher-templates'
import { loadOrBuildApercuMarche, marcheKey } from '@/lib/ia/graph/market-overview'

const apercu = {
  total: 42,
  parType: [{ cle: 'emploi', n: 20 }, { cle: 'stage', n: 12 }],
  parDomaine: [{ cle: 'Agriculture', n: 18 }],
  parRegion: [{ cle: 'Thies', n: 30 }],
  competences: [{ cle: 'Excel', n: 9 }],
  organisations: [{ cle: 'ACME', n: 7 }],
}

beforeEach(() => {
  store.clear()
  jest.clearAllMocks()
  apercuMarche.mockResolvedValue(apercu)
})

// ── Invariant CDP (le test qui compte) ────────────────────────────────────────

test('CDP : aucun template d’aperçu ne touche aux personnes', () => {
  const templates = [MARCHE_PAR_TYPE, MARCHE_PAR_DOMAINE, MARCHE_PAR_REGION, MARCHE_COMPETENCES, MARCHE_ORGANISATIONS]
  for (const t of templates) {
    expect(t).not.toMatch(/Beneficiaire/)
    expect(t).not.toMatch(/A_POSTULE/)
    expect(t).not.toMatch(/Candidature/)
    expect(t).not.toMatch(/cjsUid/)
  }
})

test('CDP : les templates ne comptent que des offres publiées non expirées', () => {
  for (const t of [MARCHE_PAR_TYPE, MARCHE_COMPETENCES, MARCHE_ORGANISATIONS]) {
    expect(t).toMatch(/o\.statut = 'publiee'/)
    expect(t).toMatch(/o\.deadline IS NULL OR o\.deadline >= datetime\(\)/)
  }
})

// ── Cache partagé ─────────────────────────────────────────────────────────────

test('1er appel : traverse le graphe puis mémoïse par périmètre', async () => {
  const out = await loadOrBuildApercuMarche({ region: 'Thies' })

  expect(out.total).toBe(42)
  expect(apercuMarche).toHaveBeenCalledTimes(1)
  expect(mockSet).toHaveBeenCalledWith(marcheKey({ region: 'Thies' }), expect.any(String), 'EX', 6 * 3600)
})

test('appel suivant sur le MÊME périmètre : servi par le cache', async () => {
  await loadOrBuildApercuMarche({ region: 'Thies' })
  apercuMarche.mockClear()

  const out = await loadOrBuildApercuMarche({ region: 'Thies' })
  expect(out.total).toBe(42)
  expect(apercuMarche).not.toHaveBeenCalled()
})

test('périmètre différent = clé différente (pas de collision Thiès / Dakar)', async () => {
  await loadOrBuildApercuMarche({ region: 'Thies' })
  await loadOrBuildApercuMarche({ region: 'Dakar' })
  expect(apercuMarche).toHaveBeenCalledTimes(2)
  expect(marcheKey({ region: 'Thies' })).not.toBe(marcheKey({ region: 'Dakar' }))
})

test('aperçu VIDE : jamais mis en cache (graphe probablement en reconstruction)', async () => {
  apercuMarche.mockResolvedValueOnce({ ...apercu, total: 0, parType: [] })
  await loadOrBuildApercuMarche({})
  expect(mockSet).not.toHaveBeenCalled()
})

test('Redis en panne → fail-soft : traversée directe, jamais d’exception', async () => {
  mockGet.mockRejectedValueOnce(new Error('redis down'))
  mockSet.mockRejectedValueOnce(new Error('redis down'))
  await expect(loadOrBuildApercuMarche({})).resolves.toMatchObject({ total: 42 })
})
