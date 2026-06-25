/**
 * @jest-environment node
 *
 * Tests du reconstructeur de transcript (GUIC-435, jalon A).
 * Vérifie : découpage en tours, asymétrie web/WhatsApp (texte verbatim),
 * agrégation intentions/outils/blocs, détection d'escalade.
 */

const mockAgentFind = jest.fn()
const mockWaFind = jest.fn()
const mockTurnFind = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agentLog: { findMany: (...a: unknown[]) => mockAgentFind(...a) },
    messageWhatsApp: { findMany: (...a: unknown[]) => mockWaFind(...a) },
    yayeTranscriptTurn: { findMany: (...a: unknown[]) => mockTurnFind(...a) },
  },
}))

import { reconstructTranscript } from '@/lib/ia/metrics/transcript'

type Row = Record<string, unknown>
function log(tsMs: number, type: string, extra: Row = {}): Row {
  return {
    id: `e${tsMs}`,
    sessionId: 's1',
    cjsUid: 'uid-1',
    role: 'beneficiaire',
    centreId: null,
    canal: 'web',
    tsMs: BigInt(tsMs),
    typeEvenement: type,
    toolCalled: null,
    payload: null,
    cypherQuery: null,
    nodesReturned: null,
    formatCanal: null,
    dureeMs: null,
    statut: 'succes',
    createdAt: new Date(tsMs),
    ...extra,
  }
}

beforeEach(() => {
  mockAgentFind.mockReset()
  mockWaFind.mockReset()
  mockTurnFind.mockReset()
  mockWaFind.mockResolvedValue([])
  mockTurnFind.mockResolvedValue([])
})

test('web : 1 tour, pas de texte verbatim, intentions/outils/blocs agrégés', async () => {
  mockAgentFind.mockResolvedValueOnce([
    log(1000, 'session_ouverte'),
    log(1100, 'message_recu', { payload: { longueur: 12 } }),
    log(1200, 'intention_detectee', { payload: { outils: ['search_opportunities'] } }),
    log(1300, 'api_appelee', { toolCalled: 'search_opportunities', statut: 'succes' }),
    log(1500, 'reponse_generee', { payload: { longueur: 80, rounds: 1, blocs: ['text', 'opportunites'] } }),
    log(1550, 'contenu_transmis', { payload: { blocs: ['text', 'opportunites'] } }),
  ])

  const t = await reconstructTranscript('s1')

  expect(t.canal).toBe('web')
  expect(t.hasVerbatimText).toBe(false)
  expect(t.nbTours).toBe(1)
  const turn = t.turns[0]
  expect(turn.userText).toBeNull()
  expect(turn.userLength).toBe(12)
  expect(turn.intentions).toEqual(['search_opportunities'])
  expect(turn.toolsUsed).toEqual(['search_opportunities'])
  expect(turn.blocs).toEqual(['text', 'opportunites'])
  expect(turn.rounds).toBe(1)
  expect(turn.dureeMs).toBe(450) // 1550 - 1100
  expect(turn.escalade).toBe(false)
})

test('web avec capture (option A) : texte verbatim injecté depuis YayeTranscriptTurn', async () => {
  mockAgentFind.mockResolvedValueOnce([
    log(1500, 'message_recu', { payload: { longueur: 10 } }),
    log(1600, 'reponse_generee', { payload: { longueur: 40, rounds: 0, blocs: ['text'] } }),
    log(1650, 'contenu_transmis', { payload: { blocs: ['text'] } }),
  ])
  mockTurnFind.mockResolvedValueOnce([
    { tourIndex: 0, userText: 'Je cherche une bourse', assistantText: 'Voici 3 bourses adaptées.' },
  ])

  const t = await reconstructTranscript('s1')
  expect(t.canal).toBe('web')
  expect(t.hasVerbatimText).toBe(true)
  expect(t.turns[0].userText).toBe('Je cherche une bourse')
  expect(t.turns[0].assistantText).toBe('Voici 3 bourses adaptées.')
})

test('whatsapp : texte verbatim entrant/sortant injecté dans les tours', async () => {
  mockAgentFind.mockResolvedValueOnce([
    log(2000, 'message_recu', { canal: 'whatsapp', payload: { longueur: 5 } }),
    log(2100, 'reponse_generee', { canal: 'whatsapp', payload: { longueur: 30, rounds: 0, blocs: ['text'] } }),
    log(2150, 'contenu_transmis', { canal: 'whatsapp', payload: { blocs: ['text'] } }),
  ])
  mockWaFind.mockResolvedValueOnce([
    { sens: 'entrant', contenu: 'Bonjour', createdAt: new Date(2000) },
    { sens: 'sortant', contenu: 'Salut, comment puis-je aider ?', createdAt: new Date(2150) },
  ])

  const t = await reconstructTranscript('s1')

  expect(t.canal).toBe('whatsapp')
  expect(t.hasVerbatimText).toBe(true)
  expect(t.turns[0].userText).toBe('Bonjour')
  expect(t.turns[0].assistantText).toBe('Salut, comment puis-je aider ?')
})

test('escalade : erreur partielle (max_tool_rounds) marque le tour comme escaladé', async () => {
  mockAgentFind.mockResolvedValueOnce([
    log(3000, 'message_recu', { payload: { longueur: 8 } }),
    log(3400, 'erreur', { statut: 'partiel', payload: { raison: 'max_tool_rounds' } }),
  ])

  const t = await reconstructTranscript('s1')
  expect(t.turns[0].erreur).toBe(true)
  expect(t.turns[0].escalade).toBe(true)
  expect(t.escalade).toBe(true)
})

test('session vide : aucun log → transcript neutre', async () => {
  mockAgentFind.mockResolvedValueOnce([])
  const t = await reconstructTranscript('inconnue')
  expect(t.canal).toBeNull()
  expect(t.nbTours).toBe(0)
  expect(t.dureeMs).toBe(0)
  expect(t.hasVerbatimText).toBe(false)
})
