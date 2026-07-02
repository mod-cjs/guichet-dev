/**
 * @jest-environment node
 *
 * GUIC-474 — Présence à un événement : action admin + endpoint badge staff.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('@/lib/auth/staff-session', () => ({ getStaffSession: jest.fn() }))
jest.mock('@/lib/auth/verifyCJSCardToken', () => {
  class CJSCardTokenError extends Error {
    constructor(public reason: string) { super(reason); this.name = 'CJSCardTokenError' }
  }
  return { verifyCJSCardToken: jest.fn(), CJSCardTokenError }
})
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    evenement: { findUnique: jest.fn() },
    inscriptionEvenement: { upsert: jest.fn(), updateMany: jest.fn() },
    centre: { findUnique: jest.fn() },
  },
}))

import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { getStaffSession } from '@/lib/auth/staff-session'
import { verifyCJSCardToken, CJSCardTokenError } from '@/lib/auth/verifyCJSCardToken'
import { recordAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { marquerPresenceEvenement } from '@/app/admin/evenements/actions'
import { POST } from '@/app/api/v1/checkin/[token]/presence/route'

const mockSession = getSession as jest.Mock
const mockStaff = getStaffSession as jest.Mock
const mockVerify = verifyCJSCardToken as jest.Mock
const mockAudit = recordAudit as jest.Mock
const mockPrisma = prisma as unknown as {
  evenement: { findUnique: jest.Mock }
  inscriptionEvenement: { upsert: jest.Mock; updateMany: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.inscriptionEvenement.upsert.mockResolvedValue({})
  mockPrisma.inscriptionEvenement.updateMany.mockResolvedValue({ count: 1 })
})

// ─── Action admin ──────────────────────────────────────────────────────────────
describe('GUIC-474 — marquerPresenceEvenement (admin)', () => {
  it('non-admin → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(marquerPresenceEvenement('e1', 'u1', true)).rejects.toThrow(/FORBIDDEN/)
  })

  it('present=true → upsert statut present + audit', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    await marquerPresenceEvenement('e1', 'u1', true)
    const call = mockPrisma.inscriptionEvenement.upsert.mock.calls[0][0]
    expect(call.where).toEqual({ cjsUid_evenementId: { cjsUid: 'u1', evenementId: 'e1' } })
    expect(call.create.statut).toBe('present')
    expect(call.update.statut).toBe('present')
    expect(mockAudit).toHaveBeenCalledWith('admin', 'evenement.presence', expect.any(Object))
  })

  it('present=false → repasse inscrit', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    await marquerPresenceEvenement('e1', 'u1', false)
    expect(mockPrisma.inscriptionEvenement.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { statut: 'inscrit' } }),
    )
    expect(mockPrisma.inscriptionEvenement.upsert).not.toHaveBeenCalled()
  })
})

// ─── Endpoint badge staff ────────────────────────────────────────────────────
const STAFF = { email: 'staff@cjs.sn', centreId: 'c1' }
const PAYLOAD = { sub: 'jeune-1', nonce: 'n', iat: 0, exp: 0 }
const req = (evenementId?: string) =>
  new NextRequest('http://localhost/api/v1/checkin/tok/presence', {
    method: 'POST',
    body: JSON.stringify(evenementId !== undefined ? { evenementId } : {}),
  })
const params = Promise.resolve({ token: 'tok' })

describe('GUIC-474 — endpoint présence badge', () => {
  it('sans session staff → 401', async () => {
    mockStaff.mockResolvedValue(null)
    const res = await POST(req('e1'), { params })
    expect(res.status).toBe(401)
  })

  it('token expiré → 410', async () => {
    mockStaff.mockResolvedValue(STAFF)
    mockVerify.mockRejectedValue(new CJSCardTokenError('expired'))
    const res = await POST(req('e1'), { params })
    expect(res.status).toBe(410)
  })

  it('token invalide (null) → 401', async () => {
    mockStaff.mockResolvedValue(STAFF)
    mockVerify.mockResolvedValue(null)
    const res = await POST(req('e1'), { params })
    expect(res.status).toBe(401)
  })

  it('événement d\'un autre centre → 403 (pas d\'écriture)', async () => {
    mockStaff.mockResolvedValue(STAFF)
    mockVerify.mockResolvedValue(PAYLOAD)
    mockPrisma.evenement.findUnique.mockResolvedValue({ centreId: 'AUTRE', titre: 'X' })
    const res = await POST(req('e1'), { params })
    expect(res.status).toBe(403)
    expect(mockPrisma.inscriptionEvenement.upsert).not.toHaveBeenCalled()
  })

  it('succès → 200 + upsert present (walk-in) + audit via badge', async () => {
    mockStaff.mockResolvedValue(STAFF)
    mockVerify.mockResolvedValue(PAYLOAD)
    mockPrisma.evenement.findUnique.mockResolvedValue({ centreId: 'c1', titre: 'Cours maths' })
    const res = await POST(req('e1'), { params })
    expect(res.status).toBe(200)
    const call = mockPrisma.inscriptionEvenement.upsert.mock.calls[0][0]
    expect(call.create).toEqual({ cjsUid: 'jeune-1', evenementId: 'e1', statut: 'present' })
    expect(mockAudit).toHaveBeenCalledWith('staff@cjs.sn', 'evenement.presence', expect.objectContaining({ meta: { via: 'badge' } }))
  })

  it('evenementId manquant → 400', async () => {
    mockStaff.mockResolvedValue(STAFF)
    mockVerify.mockResolvedValue(PAYLOAD)
    const res = await POST(req(), { params })
    expect(res.status).toBe(400)
  })
})
