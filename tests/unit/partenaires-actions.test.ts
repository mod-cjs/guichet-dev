/**
 * @jest-environment node
 *
 * GUIC-510 — Server actions de gestion des partenaires (organisations recruteurs).
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ prisma: { organisation: { update: jest.fn(), create: jest.fn() } } }))

import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { basculerVerifiePartenaire, modifierPartenaire, creerPartenaire } from '@/app/admin/partenaires/actions'

const mockSession = getSession as jest.Mock
const mockAudit = recordAudit as jest.Mock
const mockPrisma = prisma as unknown as { organisation: { update: jest.Mock; create: jest.Mock } }

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.organisation.update.mockResolvedValue({})
  mockPrisma.organisation.create.mockResolvedValue({ id: 'new-org' })
})

describe('GUIC-510 — actions partenaires', () => {
  it('non-admin → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(basculerVerifiePartenaire('p1', true)).rejects.toThrow(/FORBIDDEN/)
    expect(mockPrisma.organisation.update).not.toHaveBeenCalled()
  })

  it('vérifier → estVerifie true + audit partenaire.verify', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    await basculerVerifiePartenaire('p1', true)
    expect(mockPrisma.organisation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' }, data: { estVerifie: true } }),
    )
    expect(mockAudit).toHaveBeenCalledWith('admin', 'partenaire.verify', expect.any(Object))
  })

  // GUIC-705 — création autonome d'un partenaire (sans compte recruteur)
  it('creerPartenaire : non-admin → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(creerPartenaire({ nom: 'GIZ' })).rejects.toThrow(/FORBIDDEN/)
    expect(mockPrisma.organisation.create).not.toHaveBeenCalled()
  })

  it('creerPartenaire : crée une org SANS compte (cjsUid null) + statut active + audit', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    const res = await creerPartenaire({ nom: 'GIZ Sénégal', secteur: 'Numerique' })
    expect(res).toEqual({ id: 'new-org' })
    const data = mockPrisma.organisation.create.mock.calls[0][0].data
    expect(data.nom).toBe('GIZ Sénégal')
    expect(data.cjsUid ?? null).toBeNull() // sans compte
    expect(data.secteur).toBe('Numerique')
    expect(mockAudit).toHaveBeenCalledWith('admin', 'partenaire.create', expect.any(Object))
  })

  it('creerPartenaire : nom vide → rejet, pas de create', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    await expect(creerPartenaire({ nom: '  ' })).rejects.toThrow()
    expect(mockPrisma.organisation.create).not.toHaveBeenCalled()
  })

  it('modifier → écrit les champs éditables + audit update', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await modifierPartenaire('p1', { nom: 'Sonatel', secteur: 'Numerique', email: 'rh@sonatel.sn' } as any)
    const call = mockPrisma.organisation.update.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'p1' })
    expect(call.data.nom).toBe('Sonatel')
    expect(call.data.email).toBe('rh@sonatel.sn')
    expect(mockAudit).toHaveBeenCalledWith('admin', 'partenaire.update', expect.any(Object))
  })

  it('modifier avec email invalide → rejette (Zod)', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(modifierPartenaire('p1', { nom: 'X', email: 'pas-un-email' } as any)).rejects.toThrow()
  })
})
