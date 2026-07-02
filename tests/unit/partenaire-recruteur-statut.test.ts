/**
 * @jest-environment node
 *
 * GUIC-511 — Server action activation/suspension d'un recruteur.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ prisma: { utilisateur: { findUnique: jest.fn(), update: jest.fn() } } }))

import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { basculerStatutRecruteur } from '@/app/admin/partenaires/actions'

const mockSession = getSession as jest.Mock
const mockAudit = recordAudit as jest.Mock
const mockPrisma = prisma as unknown as { utilisateur: { findUnique: jest.Mock; update: jest.Mock } }

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.utilisateur.findUnique.mockResolvedValue({ statut: 'actif' })
  mockPrisma.utilisateur.update.mockResolvedValue({})
})

describe('GUIC-511 — basculerStatutRecruteur', () => {
  it('non-admin → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(basculerStatutRecruteur('u1', false)).rejects.toThrow(/FORBIDDEN/)
    expect(mockPrisma.utilisateur.update).not.toHaveBeenCalled()
  })

  it('suspendre → statut inactif + audit', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    await basculerStatutRecruteur('u1', false)
    expect(mockPrisma.utilisateur.update).toHaveBeenCalledWith(expect.objectContaining({ where: { cjsUid: 'u1' }, data: { statut: 'inactif' } }))
    expect(mockAudit).toHaveBeenCalledWith('admin', 'recruteur.statut', expect.any(Object))
  })

  it('réactiver → statut actif', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    mockPrisma.utilisateur.findUnique.mockResolvedValue({ statut: 'inactif' })
    await basculerStatutRecruteur('u1', true)
    expect(mockPrisma.utilisateur.update).toHaveBeenCalledWith(expect.objectContaining({ data: { statut: 'actif' } }))
  })

  it('compte anonymisé → refus (COMPTE_ANONYMISE)', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    mockPrisma.utilisateur.findUnique.mockResolvedValue({ statut: 'anonymise' })
    await expect(basculerStatutRecruteur('u1', false)).rejects.toThrow(/COMPTE_ANONYMISE/)
    expect(mockPrisma.utilisateur.update).not.toHaveBeenCalled()
  })

  it('recruteur introuvable → NOT_FOUND', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    mockPrisma.utilisateur.findUnique.mockResolvedValue(null)
    await expect(basculerStatutRecruteur('x', false)).rejects.toThrow(/NOT_FOUND/)
  })
})
