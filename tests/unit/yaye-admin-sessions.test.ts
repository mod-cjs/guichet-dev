/**
 * @jest-environment node
 *
 * Liste des sessions admin (GUIC-259) : enrichissement YQS / feedback / résultat /
 * identité, et filtre drapeau rouge au niveau requête (résumés matérialisés).
 */

const agentGroupBy = jest.fn()
const agentFindMany = jest.fn()
const summaryFindMany = jest.fn()
const feedbackGroupBy = jest.fn()
const userFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agentLog: { groupBy: (...a: unknown[]) => agentGroupBy(...a), findMany: (...a: unknown[]) => agentFindMany(...a) },
    yayeSessionSummary: { findMany: (...a: unknown[]) => summaryFindMany(...a) },
    yayeFeedback: { groupBy: (...a: unknown[]) => feedbackGroupBy(...a) },
    utilisateur: { findMany: (...a: unknown[]) => userFindMany(...a) },
  },
}))

import { listSessions } from '@/lib/ia/admin/sessions'

const pageGroup = {
  sessionId: 's1', canal: 'web', cjsUid: 'u1', centreId: null, role: 'beneficiaire',
  _min: { tsMs: BigInt(1000), createdAt: new Date('2026-06-01') }, _max: { tsMs: BigInt(3000) }, _count: { _all: 5 },
}

beforeEach(() => {
  jest.clearAllMocks()
  // page groups (by inclut cjsUid) vs distinct/flagged (by = ['sessionId']).
  agentGroupBy.mockImplementation((arg: { by: string[] }) =>
    Promise.resolve(arg.by.includes('cjsUid') ? [pageGroup] : [{ sessionId: 's1' }]),
  )
  agentFindMany.mockResolvedValue([
    { sessionId: 's1', typeEvenement: 'message_recu', statut: 'succes', toolCalled: 'search_opportunities' },
  ])
  summaryFindMany.mockResolvedValue([{ sessionId: 's1', yqs: 80, drapeauRouge: true, resolu: true, converti: false }])
  feedbackGroupBy.mockResolvedValue([{ sessionId: 's1', _sum: { note: 1 } }])
  userFindMany.mockResolvedValue([{ cjsUid: 'u1', prenom: 'Awa', nom: 'Diop' }])
})

it('enrichit chaque session avec qualité / feedback / identité', async () => {
  const { rows } = await listSessions({ from: new Date('2026-05-01'), to: new Date('2026-07-01') })
  const r = rows[0]
  expect(r.yqs).toBe(80)
  expect(r.drapeauRouge).toBe(true)
  expect(r.resolu).toBe(true)
  expect(r.feedback).toBe(1)
  expect(r.user).toEqual({ prenom: 'Awa', nom: 'Diop' })
  expect(r.intentionPrincipale).toBe('search_opportunities')
})

it('le filtre drapeau rouge interroge les résumés matérialisés', async () => {
  await listSessions({ from: new Date('2026-05-01'), to: new Date('2026-07-01'), drapeauOnly: true })
  expect(summaryFindMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { drapeauRouge: true }, select: { sessionId: true } }),
  )
})
