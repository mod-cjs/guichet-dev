/**
 * @jest-environment node
 *
 * Circuit-breaker du GraphPort (GUIC-275) : bascule à chaud Neo4j → Prisma quand
 * Neo4j tombe, reste sur Prisma pendant le cooldown, puis re-tente.
 */

jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { ResilientGraphAdapter } from '@/lib/ia/graph/resilient-adapter'
import type { GraphPort } from '@/lib/ia/graph/port'

// Port factice : `searchOpportunites` configurable (ok / throw) ; le reste no-op.
function fakePort(label: string, mode: { throws?: boolean } = {}): GraphPort {
  return {
    backend: 'neo4j',
    healthcheck: jest.fn(async () => ({ ok: true, backend: 'neo4j' as const })),
    searchOpportunites: jest.fn(async () => {
      if (mode.throws) throw new Error(`${label} down`)
      return [{ id: label, slug: label, titre: label, type: 't', organisation: null, region: null, deadline: null }]
    }),
    skillGap: jest.fn(async () => ({ manquantes: [], formations: [] })),
    eligibleOpportunites: jest.fn(async () => []),
    collaborativeReco: jest.fn(async () => []),
    multiEntityPath: jest.fn(async () => []),
  }
}

it('nominal : utilise le primaire (Neo4j) quand il répond', async () => {
  const primary = fakePort('neo4j')
  const fallback = fakePort('prisma')
  const r = new ResilientGraphAdapter(primary, fallback, { cooldownMs: 1000, now: () => 0 })

  const res = await r.searchOpportunites({})
  expect(res[0].id).toBe('neo4j')
  expect(fallback.searchOpportunites).not.toHaveBeenCalled()
})

it('échec primaire → bascule Prisma + breaker ouvert (Prisma servi sans re-toucher Neo4j)', async () => {
  const primary = fakePort('neo4j', { throws: true })
  const fallback = fakePort('prisma')
  let t = 0
  const r = new ResilientGraphAdapter(primary, fallback, { cooldownMs: 1000, now: () => t })

  // 1er appel : Neo4j jette → Prisma sert.
  const res1 = await r.searchOpportunites({})
  expect(res1[0].id).toBe('prisma')
  expect(primary.searchOpportunites).toHaveBeenCalledTimes(1)
  expect(r.breakerOpen).toBe(true)

  // 2e appel pendant le cooldown : Prisma direct, Neo4j PAS rappelé.
  t = 500
  const res2 = await r.searchOpportunites({})
  expect(res2[0].id).toBe('prisma')
  expect(primary.searchOpportunites).toHaveBeenCalledTimes(1) // toujours 1
})

it('après cooldown : re-tente le primaire (half-open)', async () => {
  const primary = fakePort('neo4j', { throws: true })
  const fallback = fakePort('prisma')
  let t = 0
  const r = new ResilientGraphAdapter(primary, fallback, { cooldownMs: 1000, now: () => t })

  await r.searchOpportunites({}) // trip à t=0 → openUntil=1000
  t = 1500 // cooldown écoulé
  await r.searchOpportunites({})
  expect(primary.searchOpportunites).toHaveBeenCalledTimes(2) // re-tenté
})
