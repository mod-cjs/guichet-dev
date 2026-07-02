/**
 * @jest-environment node
 *
 * GUIC-485 (US-3) — Transition de statut d'une candidature côté recruteur.
 * Garanties : garde fail-closed, statut restreint {Vue,Retenue,Refusee}, ownership
 * imposé par le filtre `opportunite` (recruteurUid OU organisation), NOT_FOUND si count 0.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organisation: { findFirst: jest.fn() },
    candidature: { updateMany: jest.fn() },
  },
}))

import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { changerStatutCandidature } from '@/app/recruteur/candidatures/actions'

const mockSession = getSession as jest.Mock
const mockAudit = recordAudit as jest.Mock
const mockPrisma = prisma as unknown as {
  organisation: { findFirst: jest.Mock }
  candidature: { updateMany: jest.Mock }
}

const RECRUTEUR = { cjsUid: 'rec-1', roles: ['recruteur'] }

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.organisation.findFirst.mockResolvedValue({ id: 'org-1' })
  mockPrisma.candidature.updateMany.mockResolvedValue({ count: 1 })
})

describe('GUIC-485 — changerStatutCandidature', () => {
  it('non-recruteur → FORBIDDEN, aucune écriture', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(changerStatutCandidature('c1', 'Vue' as any)).rejects.toThrow(/FORBIDDEN/)
    expect(mockPrisma.candidature.updateMany).not.toHaveBeenCalled()
  })

  it('statut invalide (En_attente) → rejet, aucune écriture', async () => {
    mockSession.mockResolvedValue(RECRUTEUR)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(changerStatutCandidature('c1', 'En_attente' as any)).rejects.toThrow()
    expect(mockPrisma.candidature.updateMany).not.toHaveBeenCalled()
  })

  it('Retenue → updateMany filtré sur ownership (opportunite OR) + audit', async () => {
    mockSession.mockResolvedValue(RECRUTEUR)
    await changerStatutCandidature('c1', 'Retenue')
    expect(mockPrisma.candidature.updateMany).toHaveBeenCalledTimes(1)
    const call = mockPrisma.candidature.updateMany.mock.calls[0][0]
    expect(call.where.id).toBe('c1')
    // Ownership : la candidature doit appartenir à une offre du recruteur.
    const or = call.where.opportunite.OR
    expect(or).toEqual(expect.arrayContaining([{ recruteurUid: 'rec-1' }, { organisationId: 'org-1' }]))
    expect(call.data.statut).toBe('Retenue')
    expect(mockAudit).toHaveBeenCalledWith('rec-1', 'candidature.statut', expect.objectContaining({ targetId: 'c1' }))
  })

  it('candidature non possédée (count 0) → NOT_FOUND', async () => {
    mockSession.mockResolvedValue(RECRUTEUR)
    mockPrisma.candidature.updateMany.mockResolvedValue({ count: 0 })
    await expect(changerStatutCandidature('cX', 'Refusee')).rejects.toThrow(/NOT_FOUND/)
    expect(mockAudit).not.toHaveBeenCalled()
  })

  it('recruteur sans organisation → ownership limité à recruteurUid', async () => {
    mockSession.mockResolvedValue(RECRUTEUR)
    mockPrisma.organisation.findFirst.mockResolvedValue(null)
    await changerStatutCandidature('c1', 'Vue')
    const or = mockPrisma.candidature.updateMany.mock.calls[0][0].where.opportunite.OR
    expect(or).toEqual([{ recruteurUid: 'rec-1' }])
  })
})
