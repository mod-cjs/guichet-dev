/**
 * @jest-environment node
 *
 * GUIC-515 — Actions kanban pipeline recruteur : déplacement d'étape + favori.
 * Garde fail-closed + ownership (offres du recruteur).
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organisation: { findFirst: jest.fn() },
    candidature: { updateMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  },
}))

import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { deplacerPipeline, basculerFavori } from '@/app/recruteur/candidatures/actions'

const mockSession = getSession as jest.Mock
const mockAudit = recordAudit as jest.Mock
const p = prisma as unknown as {
  organisation: { findFirst: jest.Mock }
  candidature: { updateMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock }
}
const REC = { cjsUid: 'rec-1', roles: ['recruteur'] }

beforeEach(() => {
  jest.clearAllMocks()
  p.organisation.findFirst.mockResolvedValue({ id: 'org-1' })
  p.candidature.updateMany.mockResolvedValue({ count: 1 })
  p.candidature.findFirst.mockResolvedValue({ id: 'c1', favoriRecruteur: false })
  p.candidature.update.mockResolvedValue({})
})

describe('GUIC-515 — deplacerPipeline', () => {
  it('non-recruteur → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(deplacerPipeline('c1', 'Preselection')).rejects.toThrow(/FORBIDDEN/)
    expect(p.candidature.updateMany).not.toHaveBeenCalled()
  })

  it('étape invalide → rejet', async () => {
    mockSession.mockResolvedValue(REC)
    await expect(deplacerPipeline('c1', 'Nimportequoi')).rejects.toThrow()
    expect(p.candidature.updateMany).not.toHaveBeenCalled()
  })

  it('count 0 → NOT_FOUND', async () => {
    mockSession.mockResolvedValue(REC)
    p.candidature.updateMany.mockResolvedValue({ count: 0 })
    await expect(deplacerPipeline('cX', 'Entretien')).rejects.toThrow(/NOT_FOUND/)
  })

  it('valide → updateMany pipelineStage (ownership) + audit', async () => {
    mockSession.mockResolvedValue(REC)
    await deplacerPipeline('c1', 'Decision')
    const call = p.candidature.updateMany.mock.calls[0][0]
    expect(call.where.id).toBe('c1')
    expect(call.where.opportunite).toBeTruthy()
    expect(call.data).toEqual({ pipelineStage: 'Decision' })
    expect(mockAudit).toHaveBeenCalledWith('rec-1', 'candidature.pipeline', expect.any(Object))
  })
})

describe('GUIC-515 — basculerFavori', () => {
  it('non-recruteur → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(basculerFavori('c1')).rejects.toThrow(/FORBIDDEN/)
  })

  it('introuvable/non possédée → NOT_FOUND', async () => {
    mockSession.mockResolvedValue(REC)
    p.candidature.findFirst.mockResolvedValue(null)
    await expect(basculerFavori('cX')).rejects.toThrow(/NOT_FOUND/)
  })

  it('bascule false → true', async () => {
    mockSession.mockResolvedValue(REC)
    const res = await basculerFavori('c1')
    expect(res).toEqual({ favori: true })
    expect(p.candidature.update).toHaveBeenCalledWith(expect.objectContaining({ data: { favoriRecruteur: true } }))
  })
})
