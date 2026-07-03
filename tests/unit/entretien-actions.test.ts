/**
 * @jest-environment node
 *
 * GUIC-514 — Actions Entretiens (recruteur). Garde fail-closed, ownership (candidature
 * d'une offre du recruteur), notification au candidat, annulation ownership.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organisation: { findFirst: jest.fn() },
    candidature: { findFirst: jest.fn() },
    entretien: { create: jest.fn(), updateMany: jest.fn() },
    notification: { create: jest.fn() },
  },
}))

import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { planifierEntretien, annulerEntretien } from '@/app/recruteur/entretiens/actions'

const mockSession = getSession as jest.Mock
const mockAudit = recordAudit as jest.Mock
const p = prisma as unknown as {
  organisation: { findFirst: jest.Mock }
  candidature: { findFirst: jest.Mock }
  entretien: { create: jest.Mock; updateMany: jest.Mock }
  notification: { create: jest.Mock }
}

const REC = { cjsUid: 'rec-1', roles: ['recruteur'] }
const VALID = { candidatureId: 'c1', dateHeure: '2026-08-01T10:00', mode: 'Visio', lieu: 'https://meet.example/x' }

beforeEach(() => {
  jest.clearAllMocks()
  p.organisation.findFirst.mockResolvedValue({ id: 'org-1' })
  p.candidature.findFirst.mockResolvedValue({ id: 'c1', cjsUid: 'cand-1' })
  p.entretien.create.mockResolvedValue({ id: 'ent-1' })
  p.notification.create.mockResolvedValue({})
  p.entretien.updateMany.mockResolvedValue({ count: 1 })
})

describe('GUIC-514 — planifierEntretien', () => {
  it('non-recruteur → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(planifierEntretien(VALID as any)).rejects.toThrow(/FORBIDDEN/)
    expect(p.entretien.create).not.toHaveBeenCalled()
  })

  it('candidature non possédée → FORBIDDEN', async () => {
    mockSession.mockResolvedValue(REC)
    p.candidature.findFirst.mockResolvedValue(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(planifierEntretien(VALID as any)).rejects.toThrow(/FORBIDDEN/)
    expect(p.entretien.create).not.toHaveBeenCalled()
  })

  it('valide → crée l\'entretien (recruteur + candidat + date) + notifie le candidat + audit', async () => {
    mockSession.mockResolvedValue(REC)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await planifierEntretien(VALID as any)
    expect(res).toEqual({ id: 'ent-1' })
    const data = p.entretien.create.mock.calls[0][0].data
    expect(data.candidatureId).toBe('c1')
    expect(data.recruteurUid).toBe('rec-1')
    expect(data.candidatUid).toBe('cand-1')
    expect(data.mode).toBe('Visio')
    expect(data.dateHeure instanceof Date).toBe(true)
    expect(p.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ cjsUid: 'cand-1' }) }))
    expect(mockAudit).toHaveBeenCalledWith('rec-1', 'entretien.plan', expect.any(Object))
  })

  it('date invalide → rejet, aucune écriture', async () => {
    mockSession.mockResolvedValue(REC)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(planifierEntretien({ ...VALID, dateHeure: 'pas-une-date' } as any)).rejects.toThrow()
    expect(p.entretien.create).not.toHaveBeenCalled()
  })

  it('mode invalide → rejet Zod', async () => {
    mockSession.mockResolvedValue(REC)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(planifierEntretien({ ...VALID, mode: 'Cafe' } as any)).rejects.toThrow()
  })
})

describe('GUIC-514 — annulerEntretien', () => {
  it('non-recruteur → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(annulerEntretien('ent-1')).rejects.toThrow(/FORBIDDEN/)
    expect(p.entretien.updateMany).not.toHaveBeenCalled()
  })

  it('non possédé (count 0) → NOT_FOUND', async () => {
    mockSession.mockResolvedValue(REC)
    p.entretien.updateMany.mockResolvedValue({ count: 0 })
    await expect(annulerEntretien('ent-x')).rejects.toThrow(/NOT_FOUND/)
    expect(mockAudit).not.toHaveBeenCalled()
  })

  it('possédé → statut Annule (ownership recruteurUid) + audit', async () => {
    mockSession.mockResolvedValue(REC)
    await annulerEntretien('ent-1')
    const call = p.entretien.updateMany.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'ent-1', recruteurUid: 'rec-1' })
    expect(call.data).toEqual({ statut: 'Annule' })
    expect(mockAudit).toHaveBeenCalledWith('rec-1', 'entretien.annule', expect.any(Object))
  })
})
