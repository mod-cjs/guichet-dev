/**
 * @jest-environment node
 *
 * GUIC-259 — route PATCH /api/admin/yaye/escalades/[id] : journalisation d'audit de chaque
 * action (traçabilité d'une file de danger), 409 sur conflit de concurrence, 403 sans droit.
 */
import { EscaladeConflictError } from '@/lib/ia/admin/escalades'

const mockGetSession = jest.fn()
const mockSetStatut = jest.fn()
const mockRecordAudit = jest.fn()

jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))
jest.mock('@/lib/ia/admin/escalades', () => ({
  setEscaladeStatut: (...a: unknown[]) => mockSetStatut(...a),
  EscaladeConflictError: jest.requireActual('@/lib/ia/admin/escalades').EscaladeConflictError,
}))
jest.mock('@/lib/audit', () => ({ recordAudit: (...a: unknown[]) => mockRecordAudit(...a) }))

import { PATCH } from '@/app/api/admin/yaye/escalades/[id]/route'
import { NextRequest } from 'next/server'

function req(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/yaye/escalades/e1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}
const params = { params: Promise.resolve({ id: 'e1' }) }

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue({ cjsUid: 'staff-1', roles: ['conseiller'] })
  mockSetStatut.mockResolvedValue(undefined)
})

describe('GUIC-259 — PATCH escalade', () => {
  it('succès → journalise l’action (audit non-PII : statut + présence de note, jamais le texte)', async () => {
    const res = await PATCH(req({ statut: 'resolue', resolutionNote: 'texte confidentiel', expectedFrom: 'prise_en_charge' }), params)
    expect(res.status).toBe(200)
    expect(mockRecordAudit).toHaveBeenCalledTimes(1)
    const [actor, action, opts] = mockRecordAudit.mock.calls[0]
    expect(actor).toBe('staff-1')
    expect(action).toBe('yaye.escalade.statut')
    expect(opts.meta.avecNote).toBe(true)
    expect(JSON.stringify(opts)).not.toContain('texte confidentiel') // jamais le texte
  })

  it('conflit de concurrence → 409, pas de journalisation d’un faux succès', async () => {
    mockSetStatut.mockRejectedValue(new EscaladeConflictError())
    const res = await PATCH(req({ statut: 'prise_en_charge', expectedFrom: 'en_attente' }), params)
    expect(res.status).toBe(409)
    expect(mockRecordAudit).not.toHaveBeenCalled()
  })

  it('sans droit → 403, aucune mutation ni audit', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u', roles: ['beneficiaire'] })
    const res = await PATCH(req({ statut: 'resolue' }), params)
    expect(res.status).toBe(403)
    expect(mockSetStatut).not.toHaveBeenCalled()
    expect(mockRecordAudit).not.toHaveBeenCalled()
  })

  it('statut invalide → 400', async () => {
    const res = await PATCH(req({ statut: 'n_importe_quoi' }), params)
    expect(res.status).toBe(400)
  })
})
