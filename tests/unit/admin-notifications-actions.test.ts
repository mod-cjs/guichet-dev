/**
 * @jest-environment node
 *
 * GUIC-550 — Actions de configuration de la matrice de notifications (admin).
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    notificationEventConfig: { findMany: jest.fn(), upsert: jest.fn() },
  },
}))

import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { loadNotificationMatrix, setEventChannels } from '@/app/admin/notifications/actions'

const mockSession = getSession as jest.Mock
const mockPrisma = prisma as unknown as {
  notificationEventConfig: { findMany: jest.Mock; upsert: jest.Mock }
}

const ADMIN = { cjsUid: 'a1', roles: ['admin'] }

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.notificationEventConfig.findMany.mockResolvedValue([])
  mockPrisma.notificationEventConfig.upsert.mockResolvedValue({})
})

describe('loadNotificationMatrix', () => {
  it('non-admin → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(loadNotificationMatrix()).rejects.toThrow(/FORBIDDEN/)
  })

  it('admin → matrice fusionnée avec surcharges DB', async () => {
    mockSession.mockResolvedValue(ADMIN)
    mockPrisma.notificationEventConfig.findMany.mockResolvedValue([
      { eventKey: 'candidature.statut_change', role: 'beneficiaire', canaux: ['in_app', 'sms'], actif: true },
    ])
    const matrix = await loadNotificationMatrix()
    const cell = matrix.find((c) => c.eventKey === 'candidature.statut_change' && c.role === 'beneficiaire')
    expect(cell).toMatchObject({ isOverride: true, canaux: ['in_app', 'sms'] })
  })
})

describe('setEventChannels', () => {
  it('non-admin → FORBIDDEN, aucune écriture', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(setEventChannels('candidature.statut_change', 'beneficiaire', ['in_app'], true)).rejects.toThrow(/FORBIDDEN/)
    expect(mockPrisma.notificationEventConfig.upsert).not.toHaveBeenCalled()
  })

  it('admin → upsert sur la clé (event, role) + audit', async () => {
    mockSession.mockResolvedValue(ADMIN)
    await setEventChannels('candidature.statut_change', 'beneficiaire', ['in_app', 'sms'], true)
    const call = mockPrisma.notificationEventConfig.upsert.mock.calls[0][0]
    expect(call.where.eventKey_role).toEqual({ eventKey: 'candidature.statut_change', role: 'beneficiaire' })
    expect(call.create.canaux).toEqual(['in_app', 'sms'])
    expect(call.update.canaux).toEqual(['in_app', 'sms'])
    expect(recordAudit).toHaveBeenCalledWith('a1', 'notif.config', expect.objectContaining({ targetId: 'candidature.statut_change:beneficiaire' }))
  })

  it('rejette un rôle non applicable (validation)', async () => {
    mockSession.mockResolvedValue(ADMIN)
    await expect(setEventChannels('candidature.statut_change', 'recruteur', ['in_app'], true)).rejects.toThrow(/non applicable/i)
    expect(mockPrisma.notificationEventConfig.upsert).not.toHaveBeenCalled()
  })
})
