/**
 * @jest-environment node
 *
 * GUIC-28 / GUIC-471 — Server actions CRUD + modération tracée des opportunités admin.
 * Prisma, le service, l'auth et l'audit sont mockés : on vérifie la garde de rôle
 * (fail-closed), la délégation au service, la traçabilité de modération sur l'offre
 * (moderePar/modereLe/motifRejet) et le soft-delete.
 */

// ─── Mocks de bord ───────────────────────────────────────────────────────────
// Factories AUTONOMES (créent leurs jest.fn() en interne) : le module testé
// `import`e `@/lib/prisma` etc. au top-level → les factories s'exécutent AVANT
// l'initialisation des const, donc on récupère les références APRÈS les imports.
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/services/opportunite-service', () => {
  const instance = { create: jest.fn(), update: jest.fn() }
  return { OpportuniteService: jest.fn(() => instance) }
})
jest.mock('@/lib/prisma', () => ({
  prisma: { opportunite: { findUnique: jest.fn(), updateMany: jest.fn(), update: jest.fn() } },
}))

import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { OpportuniteService } from '@/lib/services/opportunite-service'
import { prisma } from '@/lib/prisma'
import {
  creerOpportunite,
  modifierOpportunite,
  archiverOpportunite,
  supprimerOpportunite,
  approuverOpportunite,
  rejeterOpportunite,
  publierOpportunite,
} from '@/app/admin/opportunites/actions'

// Références typées vers les mocks (l'instance de service est partagée à chaque `new`).
const mockGetSession = getSession as jest.Mock
const mockRecordAudit = recordAudit as jest.Mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const svc = new (OpportuniteService as any)() as { create: jest.Mock; update: jest.Mock }
const mockCreate = svc.create
const mockUpdate = svc.update
const mockPrisma = prisma as unknown as {
  opportunite: { findUnique: jest.Mock; updateMany: jest.Mock; update: jest.Mock }
}

const ADMIN = { cjsUid: 'admin-1', roles: ['admin'] }
const JEUNE = { cjsUid: 'jeune-1', roles: ['beneficiaire'] }

function brouilloninput(statut: 'brouillon' | 'publiee' = 'brouillon') {
  return {
    type: 'bourse' as const,
    base: {
      titre: 'Bourse test',
      slug: 'bourse-test',
      description: 'Une bourse de test.',
      organisationLibelle: 'CJS',
      domaine: 'Entrepreneuriat',
      statut,
    },
    details: { montantTotalFcfa: 500000, organismeFinanceur: 'CJS' },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.opportunite.findUnique.mockResolvedValue(null)
  mockPrisma.opportunite.updateMany.mockResolvedValue({ count: 1 })
  mockPrisma.opportunite.update.mockResolvedValue({})
  mockCreate.mockResolvedValue({ id: 'opp-1', statut: 'brouillon' })
  mockUpdate.mockResolvedValue({ id: 'opp-1' })
})

describe('GUIC-28 — garde de rôle (fail-closed)', () => {
  it('given non-admin, when creer, then FORBIDDEN et service NON appelé', async () => {
    mockGetSession.mockResolvedValue(JEUNE)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(creerOpportunite(brouilloninput() as any)).rejects.toThrow(/FORBIDDEN/)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('given session absente, when supprimer, then FORBIDDEN', async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(supprimerOpportunite('opp-1')).rejects.toThrow(/FORBIDDEN/)
  })
})

describe('GUIC-28 — création', () => {
  it('given admin + brouillon, when creer, then délègue au service + audit create', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await creerOpportunite(brouilloninput() as any)
    expect(res).toEqual({ id: 'opp-1' })
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockRecordAudit).toHaveBeenCalledWith('admin-1', 'opportunite.create', expect.any(Object))
    // Pas de publication directe → pas de trace de modération sur l'offre.
    expect(mockPrisma.opportunite.update).not.toHaveBeenCalled()
  })

  it('given slug déjà existant, when creer, then SLUG_EXISTANT et pas de create', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    mockPrisma.opportunite.findUnique.mockResolvedValue({ id: 'deja' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(creerOpportunite(brouilloninput() as any)).rejects.toThrow(/SLUG_EXISTANT/)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('given statut publiee (publication directe), when creer, then trace moderePar + audit publish', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    mockCreate.mockResolvedValue({ id: 'opp-2', statut: 'publiee' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await creerOpportunite(brouilloninput('publiee') as any)
    expect(mockPrisma.opportunite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'opp-2' },
        data: expect.objectContaining({ moderePar: 'admin-1' }),
      }),
    )
    expect(mockRecordAudit).toHaveBeenCalledWith('admin-1', 'opportunite.publish', expect.any(Object))
  })
})

describe('GUIC-28 — édition / archivage / suppression', () => {
  it('given admin, when modifier, then délègue update + audit update', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await modifierOpportunite('opp-1', { base: { titre: 'Nouveau titre' } })
    expect(mockUpdate).toHaveBeenCalledWith('opp-1', { base: { titre: 'Nouveau titre' } })
    expect(mockRecordAudit).toHaveBeenCalledWith('admin-1', 'opportunite.update', expect.any(Object))
  })

  it('given admin, when supprimer, then SOFT delete (deletedAt) + audit delete', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await supprimerOpportunite('opp-1')
    const call = mockPrisma.opportunite.updateMany.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'opp-1', deletedAt: null })
    expect(call.data.deletedAt).toBeInstanceOf(Date)
    expect(mockRecordAudit).toHaveBeenCalledWith('admin-1', 'opportunite.delete', expect.any(Object))
  })

  it('given offre introuvable, when supprimer, then NOT_FOUND', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    mockPrisma.opportunite.updateMany.mockResolvedValue({ count: 0 })
    await expect(supprimerOpportunite('opp-x')).rejects.toThrow(/NOT_FOUND/)
  })

  it('given admin, when archiver, then statut archivee + audit', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await archiverOpportunite('opp-1')
    const call = mockPrisma.opportunite.updateMany.mock.calls[0][0]
    expect(call.data).toEqual({ statut: 'archivee' })
  })
})

describe('GUIC-471 — modération tracée sur l\'offre', () => {
  it('given admin, when approuver, then publiee + moderePar/modereLe + motifRejet null', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await approuverOpportunite('opp-1')
    const call = mockPrisma.opportunite.updateMany.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'opp-1', statut: 'brouillon', deletedAt: null })
    expect(call.data.statut).toBe('publiee')
    expect(call.data.moderePar).toBe('admin-1')
    expect(call.data.modereLe).toBeInstanceOf(Date)
    expect(call.data.motifRejet).toBeNull()
  })

  it('given admin + motif, when rejeter, then archivee + motifRejet persisté + audit reason', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await rejeterOpportunite('opp-1', '  Hors charte éditoriale  ')
    const call = mockPrisma.opportunite.updateMany.mock.calls[0][0]
    expect(call.data.statut).toBe('archivee')
    expect(call.data.motifRejet).toBe('Hors charte éditoriale')
    expect(call.data.moderePar).toBe('admin-1')
    expect(mockRecordAudit).toHaveBeenCalledWith(
      'admin-1',
      'opportunite.reject',
      expect.objectContaining({ meta: expect.objectContaining({ reason: 'Hors charte éditoriale' }) }),
    )
  })

  it('given offre déjà modérée (count 0), when approuver, then NOT_FOUND_OR_NOT_BROUILLON', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    mockPrisma.opportunite.updateMany.mockResolvedValue({ count: 0 })
    await expect(approuverOpportunite('opp-1')).rejects.toThrow(/NOT_FOUND_OR_NOT_BROUILLON/)
  })

  it('given admin, when publier directement, then publiee + audit publish', async () => {
    mockGetSession.mockResolvedValue(ADMIN)
    await publierOpportunite('opp-1')
    expect(mockRecordAudit).toHaveBeenCalledWith('admin-1', 'opportunite.publish', expect.any(Object))
  })
})
