/**
 * @jest-environment node
 *
 * File d'escalade admin (GUIC-259) : compteurs par statut respectant le filtre
 * (canal/centre/danger, PAS le statut), filtre danger, enrichissement bénéficiaire.
 */

const mockFindMany = jest.fn()
const mockCount = jest.fn()
const mockGroupBy = jest.fn()
const mockUserFind = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    escaladeYaye: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
      groupBy: (...a: unknown[]) => mockGroupBy(...a),
    },
    utilisateur: { findMany: (...a: unknown[]) => mockUserFind(...a) },
  },
}))

import { listEscalades } from '@/lib/ia/admin/escalades'

beforeEach(() => {
  jest.clearAllMocks()
  mockFindMany.mockResolvedValue([
    { id: 'e1', sessionId: 's1', cjsUid: 'u1', role: 'beneficiaire', centreId: null, canal: 'whatsapp', raison: 'sujet_sensible', stade: null, signalDanger: 'violence', priorite: 1, statut: 'en_attente', traitePar: null, traiteA: null, createdAt: new Date() },
  ])
  mockCount.mockResolvedValue(1)
  mockGroupBy.mockResolvedValue([{ statut: 'en_attente', _count: { _all: 3 } }])
  mockUserFind.mockResolvedValue([{ cjsUid: 'u1', prenom: 'Awa', nom: 'Diop', telephone: '+221770000000' }])
})

it('les compteurs de chips ignorent le filtre statut mais respectent le canal', async () => {
  const res = await listEscalades({ statut: 'en_attente', canal: 'whatsapp' })
  // groupBy reçoit le filtre SANS statut (sinon les chips seraient faux).
  expect(mockGroupBy.mock.calls[0][0].where).toEqual({ canal: 'whatsapp' })
  expect(res.counts.en_attente).toBe(3)
})

it('le filtre lateOnly (SLA dépassé) borne sur les non-résolues au-delà du SLA (liste ET compteurs)', async () => {
  await listEscalades({ lateOnly: true })
  const where = mockFindMany.mock.calls[0][0].where
  // Composé via AND pour ne pas collisionner d'autres OR.
  expect(where.AND[0].statut).toEqual({ not: 'resolue' })
  expect(Array.isArray(where.AND[0].OR)).toBe(true)
  expect(where.AND[0].OR.length).toBeGreaterThanOrEqual(2)
  // Les compteurs de chips respectent aussi le filtre retard (baseWhere).
  expect(mockGroupBy.mock.calls[0][0].where.AND[0].OR).toBeDefined()
})

it('la recherche libre borne sur session OU bénéficiaires correspondants (nom/tel)', async () => {
  mockUserFind.mockResolvedValue([{ cjsUid: 'u1', prenom: 'Awa', nom: 'Diop', telephone: '+221770000000' }])
  await listEscalades({ q: 'Diop' })
  const where = mockFindMany.mock.calls[0][0].where
  const or = where.AND[0].OR
  expect(or).toEqual(expect.arrayContaining([
    { sessionId: { contains: 'Diop' } },
    { cjsUid: { in: ['u1'] } },
  ]))
})

it('le filtre de dates borne createdAt (from/to)', async () => {
  const from = new Date('2026-08-01'); const to = new Date('2026-08-31')
  await listEscalades({ from, to })
  expect(mockFindMany.mock.calls[0][0].where.createdAt).toEqual({ gte: from, lte: to })
})

it('chaque ligne porte son échéance SLA (echeanceSla dérivée priorité+createdAt)', async () => {
  const res = await listEscalades({})
  expect(res.rows[0].echeanceSla).toBeInstanceOf(Date)
})

it('le filtre danger borne sur signal_danger non nul et enrichit le bénéficiaire', async () => {
  const res = await listEscalades({ dangerOnly: true })
  expect(mockFindMany.mock.calls[0][0].where).toEqual({ signalDanger: { not: null } })
  expect(res.rows[0].user).toEqual({ prenom: 'Awa', nom: 'Diop', telephone: '+221770000000' })
})
