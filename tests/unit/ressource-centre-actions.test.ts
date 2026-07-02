/**
 * @jest-environment node
 *
 * GUIC-473 — Server actions CRUD des ressources réservables d'un centre.
 * Prisma / auth / audit / cache mockés : garde admin fail-closed, délégation,
 * refus de suppression si réservations, traçabilité audit.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    centre: { findUnique: jest.fn() },
    ressourceCentre: { create: jest.fn(), update: jest.fn(), delete: jest.fn(), findUnique: jest.fn() },
  },
}))

import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import {
  creerRessourceCentre,
  modifierRessourceCentre,
  basculerActiveRessourceCentre,
  supprimerRessourceCentre,
} from '@/app/admin/centres/ressources-actions'

const mockSession = getSession as jest.Mock
const mockAudit = recordAudit as jest.Mock
const mockPrisma = prisma as unknown as {
  centre: { findUnique: jest.Mock }
  ressourceCentre: { create: jest.Mock; update: jest.Mock; delete: jest.Mock; findUnique: jest.Mock }
}

const ADMIN = { cjsUid: 'admin-1', roles: ['admin'] }
const JEUNE = { cjsUid: 'j-1', roles: ['beneficiaire'] }

const input = {
  type: 'Salle' as const,
  nom: 'Salle A',
  capacite: 20,
  dureeMinCreneauMin: 60,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue(ADMIN)
  mockPrisma.centre.findUnique.mockResolvedValue({ id: 'c-1' })
  mockPrisma.ressourceCentre.create.mockResolvedValue({ id: 'r-1' })
  mockPrisma.ressourceCentre.update.mockResolvedValue({ centreId: 'c-1' })
  mockPrisma.ressourceCentre.delete.mockResolvedValue({})
  mockPrisma.ressourceCentre.findUnique.mockResolvedValue({ centreId: 'c-1', _count: { reservations: 0 } })
})

describe('GUIC-473 — garde de rôle', () => {
  it('non-admin → FORBIDDEN, pas de create', async () => {
    mockSession.mockResolvedValue(JEUNE)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(creerRessourceCentre('c-1', input as any)).rejects.toThrow(/FORBIDDEN/)
    expect(mockPrisma.ressourceCentre.create).not.toHaveBeenCalled()
  })
})

describe('GUIC-473 — création', () => {
  it('crée la ressource rattachée au centre + audit create', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await creerRessourceCentre('c-1', input as any)
    expect(res).toEqual({ id: 'r-1' })
    const call = mockPrisma.ressourceCentre.create.mock.calls[0][0]
    expect(call.data.centreId).toBe('c-1')
    expect(call.data.nom).toBe('Salle A')
    expect(mockAudit).toHaveBeenCalledWith('admin-1', 'ressource_centre.create', expect.any(Object))
  })

  it('centre inexistant → CENTRE_INTROUVABLE', async () => {
    mockPrisma.centre.findUnique.mockResolvedValue(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(creerRessourceCentre('c-x', input as any)).rejects.toThrow(/CENTRE_INTROUVABLE/)
    expect(mockPrisma.ressourceCentre.create).not.toHaveBeenCalled()
  })
})

describe('GUIC-473 — édition / bascule', () => {
  it('modifier délègue update + audit', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await modifierRessourceCentre('r-1', input as any)
    expect(mockPrisma.ressourceCentre.update).toHaveBeenCalled()
    expect(mockAudit).toHaveBeenCalledWith('admin-1', 'ressource_centre.update', expect.any(Object))
  })

  it('basculer estActive écrit estActive et audite', async () => {
    await basculerActiveRessourceCentre('r-1', false)
    expect(mockPrisma.ressourceCentre.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r-1' }, data: { estActive: false } }),
    )
  })
})

describe('GUIC-473 — suppression', () => {
  it('supprime si aucune réservation + audit delete', async () => {
    await supprimerRessourceCentre('r-1')
    expect(mockPrisma.ressourceCentre.delete).toHaveBeenCalledWith({ where: { id: 'r-1' } })
    expect(mockAudit).toHaveBeenCalledWith('admin-1', 'ressource_centre.delete', expect.any(Object))
  })

  it('refuse la suppression si des réservations existent (RESSOURCE_NON_VIDE)', async () => {
    mockPrisma.ressourceCentre.findUnique.mockResolvedValue({ centreId: 'c-1', _count: { reservations: 3 } })
    await expect(supprimerRessourceCentre('r-1')).rejects.toThrow(/RESSOURCE_NON_VIDE/)
    expect(mockPrisma.ressourceCentre.delete).not.toHaveBeenCalled()
  })

  it('ressource inexistante → NOT_FOUND', async () => {
    mockPrisma.ressourceCentre.findUnique.mockResolvedValue(null)
    await expect(supprimerRessourceCentre('r-x')).rejects.toThrow(/NOT_FOUND/)
  })
})
