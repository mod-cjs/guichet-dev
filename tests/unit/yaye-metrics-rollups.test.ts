/**
 * @jest-environment node
 *
 * Tests du service de rollups (GUIC-435, jalon A, couches 1-2).
 * Vérifie les KPI opérationnels et d'efficacité calculés sur agent_logs.
 */

const mockAgentFind = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { agentLog: { findMany: (...a: unknown[]) => mockAgentFind(...a) } },
}))

import { computeRollups } from '@/lib/ia/metrics/rollups'

type Row = Record<string, unknown>
function row(sessionId: string, tsMs: number, type: string, extra: Row = {}): Row {
  return {
    sessionId,
    canal: 'web',
    tsMs: BigInt(tsMs),
    typeEvenement: type,
    statut: 'succes',
    nodesReturned: null,
    payload: null,
    ...extra,
  }
}

beforeEach(() => mockAgentFind.mockReset())

test('agrège latence, succès outil, escalade, abandon sur 2 sessions', async () => {
  mockAgentFind.mockResolvedValueOnce([
    // Session s1 : 1 tour complet, outil ok, latence 400ms
    row('s1', 1000, 'message_recu', { payload: { longueur: 10 } }),
    row('s1', 1100, 'api_appelee', { toolCalled: 'search_opportunities', statut: 'succes' }),
    row('s1', 1200, 'reponse_generee', { payload: { rounds: 1, blocs: ['text'] } }),
    row('s1', 1400, 'contenu_transmis', { payload: { blocs: ['text'] } }),
    // Session s2 : 1 tour, outil en échec, escalade, pas de contenu transmis (abandon)
    row('s2', 2000, 'message_recu', { payload: { longueur: 5 } }),
    row('s2', 2100, 'api_appelee', { toolCalled: 'reserve_resource', statut: 'echec' }),
    row('s2', 2200, 'erreur', { statut: 'partiel', payload: { raison: 'max_tool_rounds' } }),
  ])

  const r = await computeRollups()

  expect(r.sessions).toBe(2)
  // 1 api succès / 2 api = 0.5
  expect(r.tauxSuccesOutil).toBeCloseTo(0.5, 5)
  // s2 escaladée (erreur partiel) → 1/2
  expect(r.tauxEscalade).toBeCloseTo(0.5, 5)
  expect(r.tauxConfinement).toBeCloseTo(0.5, 5)
  // s2 a un message reçu mais aucun contenu transmis → abandon 1/2
  expect(r.tauxAbandon).toBeCloseTo(0.5, 5)
  // latence d'un seul tour mesurable (s1) : 1400-1000 = 400
  expect(r.latenceTourMs.p50).toBe(400)
  expect(r.latenceTourMs.max).toBe(400)
  // profondeur de boucle : un seul reponse_generee avec rounds=1
  expect(r.profondeurBoucle.moyenne).toBe(1)
  expect(r.profondeurBoucle.distribution['1']).toBe(1)
})

test('reponse_generee sans contenu_transmis = réponse livrée (pas un abandon) + latence', async () => {
  mockAgentFind.mockResolvedValueOnce([
    row('s1', 1000, 'message_recu', { payload: { longueur: 6 } }),
    row('s1', 1300, 'reponse_generee', { payload: { rounds: 0, blocs: ['text'] } }),
    // pas de contenu_transmis (cas des logs réels enrichis)
  ])

  const r = await computeRollups()
  expect(r.tauxAbandon).toBe(0) // la réponse a bien été générée
  expect(r.latenceTourMs.p50).toBe(300) // 1300 - 1000, retombe sur reponse_generee
})

test('taux de requête sèche : graph_interroge à 0 nœud', async () => {
  mockAgentFind.mockResolvedValueOnce([
    row('s1', 1000, 'message_recu', { payload: { longueur: 4 } }),
    row('s1', 1100, 'graph_interroge', { toolCalled: 'query_knowledge_graph', nodesReturned: { count: 0 } }),
    row('s1', 1200, 'graph_interroge', { toolCalled: 'query_knowledge_graph', nodesReturned: { count: 7 } }),
    row('s1', 1300, 'contenu_transmis', { payload: { blocs: ['text'] } }),
  ])

  const r = await computeRollups()
  expect(r.tauxRequeteSeche).toBeCloseTo(0.5, 5) // 1 sèche / 2
})

test('ventilation par canal', async () => {
  mockAgentFind.mockResolvedValueOnce([
    row('s1', 1000, 'message_recu', { canal: 'web', payload: { longueur: 4 } }),
    row('s1', 1200, 'contenu_transmis', { canal: 'web', payload: { blocs: ['text'] } }),
    row('s2', 2000, 'message_recu', { canal: 'whatsapp', payload: { longueur: 4 } }),
    row('s2', 2100, 'erreur', { canal: 'whatsapp', statut: 'partiel' }),
  ])

  const r = await computeRollups()
  expect(r.parCanal['web'].sessions).toBe(1)
  expect(r.parCanal['whatsapp'].sessions).toBe(1)
  expect(r.parCanal['whatsapp'].tauxEscalade).toBeCloseTo(1, 5)
})

test('fenêtre vide → rollups neutres (pas de division par zéro)', async () => {
  mockAgentFind.mockResolvedValueOnce([])
  const r = await computeRollups({ from: new Date('2026-01-01'), to: new Date('2026-01-02') })
  expect(r.sessions).toBe(0)
  expect(r.tauxSuccesOutil).toBe(0)
  expect(r.tauxEscalade).toBe(0)
  expect(r.latenceTourMs.p50).toBe(0)
})
