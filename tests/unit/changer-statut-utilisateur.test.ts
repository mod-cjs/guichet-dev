/**
 * @jest-environment node
 *
 * GUIC-705 — Filet serveur du toggle de statut PERSONNE (compte utilisateur).
 * Action canonique unique `changerStatutUtilisateur` (espace Utilisateurs) : garde
 * `anonymise`, bascule actif↔inactif, audit `admin.utilisateur.statut`. Reprend la
 * couverture qui vivait sous le doublon `basculerStatutRecruteur` (supprimé — le
 * levier org est `basculerStatutOrganisation`, distinct).
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ prisma: { utilisateur: { findUnique: jest.fn(), update: jest.fn() } } }))

import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { changerStatutUtilisateur } from '@/app/admin/utilisateurs/actions'

const mockSession = getSession as jest.Mock
const mockAudit = recordAudit as jest.Mock
const mockPrisma = prisma as unknown as { utilisateur: { findUnique: jest.Mock; update: jest.Mock } }

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.utilisateur.findUnique.mockResolvedValue({ statut: 'actif' })
  mockPrisma.utilisateur.update.mockResolvedValue({})
})

describe('GUIC-705 — changerStatutUtilisateur (levier PERSONNE canonique)', () => {
  it('non-admin → FORBIDDEN, aucune écriture', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(changerStatutUtilisateur('u1', 'inactif')).resolves.toEqual({ ok: false, error: 'FORBIDDEN' })
    expect(mockPrisma.utilisateur.update).not.toHaveBeenCalled()
  })

  it('suspendre → statut inactif + audit admin.utilisateur.statut', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    await expect(changerStatutUtilisateur('u1', 'inactif')).resolves.toEqual({ ok: true })
    expect(mockPrisma.utilisateur.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cjsUid: 'u1' }, data: { statut: 'inactif' } }),
    )
    expect(mockAudit).toHaveBeenCalledWith('admin', 'admin.utilisateur.statut', expect.any(Object))
  })

  it('réactiver → statut actif', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    mockPrisma.utilisateur.findUnique.mockResolvedValue({ statut: 'inactif' })
    await expect(changerStatutUtilisateur('u1', 'actif')).resolves.toEqual({ ok: true })
    expect(mockPrisma.utilisateur.update).toHaveBeenCalledWith(expect.objectContaining({ data: { statut: 'actif' } }))
  })

  it('compte anonymisé → refus (ANONYMISE), aucune écriture', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    mockPrisma.utilisateur.findUnique.mockResolvedValue({ statut: 'anonymise' })
    await expect(changerStatutUtilisateur('u1', 'inactif')).resolves.toEqual({ ok: false, error: 'ANONYMISE' })
    expect(mockPrisma.utilisateur.update).not.toHaveBeenCalled()
  })

  it('utilisateur introuvable → INTROUVABLE', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'admin', roles: ['admin'] })
    mockPrisma.utilisateur.findUnique.mockResolvedValue(null)
    await expect(changerStatutUtilisateur('x', 'inactif')).resolves.toEqual({ ok: false, error: 'INTROUVABLE' })
  })
})
