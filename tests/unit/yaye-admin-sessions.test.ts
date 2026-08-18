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
const escaladeGroupBy = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agentLog: { groupBy: (...a: unknown[]) => agentGroupBy(...a), findMany: (...a: unknown[]) => agentFindMany(...a) },
    yayeSessionSummary: { findMany: (...a: unknown[]) => summaryFindMany(...a) },
    yayeFeedback: { groupBy: (...a: unknown[]) => feedbackGroupBy(...a) },
    utilisateur: { findMany: (...a: unknown[]) => userFindMany(...a) },
    escaladeYaye: { groupBy: (...a: unknown[]) => escaladeGroupBy(...a) },
  },
}))

import { listSessions, sessionsSummary } from '@/lib/ia/admin/sessions'

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
  escaladeGroupBy.mockResolvedValue([{ sessionId: 's1' }])
})

it('enrichit chaque session avec qualité / feedback / identité', async () => {
  const { rows } = await listSessions({ from: new Date('2026-05-01'), to: new Date('2026-07-01') })
  const r = rows[0]
  expect(r.yqs).toBe(80)
  expect(r.drapeauRouge).toBe(true)
  expect(r.resolu).toBe(true)
  expect(r.feedback).toBe(1)
  expect(r.user).toEqual({ prenom: 'Awa', nom: 'Diop' })
  expect(r.outilPrincipal).toBe('search_opportunities')
})

it('le filtre drapeau rouge interroge les résumés matérialisés', async () => {
  await listSessions({ from: new Date('2026-05-01'), to: new Date('2026-07-01'), drapeauOnly: true })
  expect(summaryFindMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { drapeauRouge: true }, select: { sessionId: true } }),
  )
})

// Compteur cohérent avec l'écran escalades (même source escalades_yaye — GUIC-259 mineur).
it("sessionsSummary compte les escalades depuis escaladeYaye, pas depuis agent_logs", async () => {
  escaladeGroupBy.mockResolvedValue([{ sessionId: 's1' }, { sessionId: 's2' }])
  const summary = await sessionsSummary({ from: new Date('2026-05-01'), to: new Date('2026-07-01') })
  expect(escaladeGroupBy).toHaveBeenCalledWith(
    expect.objectContaining({ by: ['sessionId'] }),
  )
  expect(summary.escalades).toBe(2)
  // Ne doit plus jamais interroger agentLog pour typeEvenement = escalade_conseiller.
  const escaladeCallOnAgentLog = agentGroupBy.mock.calls.some(
    (call) => (call[0] as { where?: { typeEvenement?: string } })?.where?.typeEvenement === 'escalade_conseiller',
  )
  expect(escaladeCallOnAgentLog).toBe(false)
})
