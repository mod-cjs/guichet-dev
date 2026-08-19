/**
 * @jest-environment node
 *
 * GUIC-435 (Phase 2) — alerterRegressionQualite : notifie les admins UNIQUEMENT quand la
 * qualité a régressé (pas à l'initialisation de la baseline, pas si RAS), en nommant les
 * métriques en baisse. Fail-soft côté cron.
 */
const mockUserFind = jest.fn()
jest.mock('@/lib/prisma', () => ({ prisma: { utilisateur: { findMany: (...a: unknown[]) => mockUserFind(...a) } } }))
const mockEmit = jest.fn()
jest.mock('@/lib/notifications/emit', () => ({ emitEvent: (...a: unknown[]) => mockEmit(...a) }))

import { alerterRegressionQualite } from '@/lib/ia/metrics/regression-alert'
import type { RegressionReport } from '@/lib/ia/metrics/regression-data'

const ADMIN = { cjsUid: 'admin-1', prenom: 'Awa', telephone: null, email: 'a@x.sn' }

function report(over: Partial<RegressionReport>): RegressionReport {
  return {
    result: { regressed: true, raisons: ['yqs'], deltas: { yqs: -8, fidelite: null, conformiteCdp: null, intentPrecision: null } },
    current: { yqs: 62 } as never,
    baseline: { yqs: 70 } as never,
    baselineInitialisee: false,
    ...over,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUserFind.mockResolvedValue([ADMIN])
  mockEmit.mockResolvedValue(undefined)
})

describe('GUIC-435 — alerterRegressionQualite', () => {
  it('régression → émet yaye.qualite_degradee aux admins, message nomme la baisse (YQS)', async () => {
    const n = await alerterRegressionQualite(report({}))
    expect(n).toBe(1)
    expect(mockEmit).toHaveBeenCalledTimes(1)
    const [event, ctx] = mockEmit.mock.calls[0]
    expect(event).toBe('yaye.qualite_degradee')
    expect(ctx.recipients[0].role).toBe('admin')
    expect(ctx.contenu).toMatch(/YQS -8/)
  })

  it('pas de régression → aucune alerte', async () => {
    const r = report({ result: { regressed: false, raisons: [], deltas: { yqs: 1, fidelite: null, conformiteCdp: null, intentPrecision: null } } })
    expect(await alerterRegressionQualite(r)).toBe(0)
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('baseline en cours d’initialisation → aucune alerte (rien à comparer)', async () => {
    expect(await alerterRegressionQualite(report({ result: null, baselineInitialisee: true }))).toBe(0)
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('aucun admin → aucune émission', async () => {
    mockUserFind.mockResolvedValue([])
    expect(await alerterRegressionQualite(report({}))).toBe(0)
    expect(mockEmit).not.toHaveBeenCalled()
  })
})
