/**
 * @jest-environment node
 *
 * GUIC-513 — Actions Paramètres (préférences notif) + Profil entreprise éditable (recruteur).
 * Garde fail-closed, ownership de l'organisation, champs protégés (nom/estVerifie non modifiables).
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: { update: jest.fn() },
    organisation: { findFirst: jest.fn(), update: jest.fn() },
  },
}))

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { modifierPreferencesNotif } from '@/app/recruteur/parametres/actions'
import { modifierProfilEntreprise } from '@/app/recruteur/profil-entreprise/actions'

const mockSession = getSession as jest.Mock
const p = prisma as unknown as {
  utilisateur: { update: jest.Mock }
  organisation: { findFirst: jest.Mock; update: jest.Mock }
}

const REC = { cjsUid: 'rec-1', roles: ['recruteur'] }

beforeEach(() => {
  jest.clearAllMocks()
  p.utilisateur.update.mockResolvedValue({})
  p.organisation.findFirst.mockResolvedValue({ id: 'org-1' })
  p.organisation.update.mockResolvedValue({})
})

describe('GUIC-513 — modifierPreferencesNotif', () => {
  it('non-recruteur → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(modifierPreferencesNotif({ notifCandidatures: true, notifMessages: false } as any)).rejects.toThrow(/FORBIDDEN/)
    expect(p.utilisateur.update).not.toHaveBeenCalled()
  })

  it('recruteur → met à jour les 2 préférences', async () => {
    mockSession.mockResolvedValue(REC)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await modifierPreferencesNotif({ notifCandidatures: false, notifMessages: true } as any)
    expect(p.utilisateur.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cjsUid: 'rec-1' }, data: { notifCandidatures: false, notifMessages: true } }),
    )
  })
})

describe('GUIC-513 — modifierProfilEntreprise', () => {
  it('non-recruteur → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(modifierProfilEntreprise({ description: 'x' } as any)).rejects.toThrow(/FORBIDDEN/)
    expect(p.organisation.update).not.toHaveBeenCalled()
  })

  it('recruteur sans organisation → NO_ORGANISATION', async () => {
    mockSession.mockResolvedValue(REC)
    p.organisation.findFirst.mockResolvedValue(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(modifierProfilEntreprise({ description: 'x' } as any)).rejects.toThrow(/NO_ORGANISATION/)
    expect(p.organisation.update).not.toHaveBeenCalled()
  })

  it('met à jour les champs éditables, jamais nom ni estVerifie', async () => {
    mockSession.mockResolvedValue(REC)
    await modifierProfilEntreprise({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      description: 'Nouvelle présentation', email: 'rh@simplon.sn', siteWeb: 'https://simplon.sn', nom: 'HACK', estVerifie: true,
    } as any)
    const call = p.organisation.update.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'org-1' })
    expect(call.data.description).toBe('Nouvelle présentation')
    expect(call.data.email).toBe('rh@simplon.sn')
    expect(call.data).not.toHaveProperty('nom')
    expect(call.data).not.toHaveProperty('estVerifie')
  })

  it('email invalide → rejet Zod', async () => {
    mockSession.mockResolvedValue(REC)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(modifierProfilEntreprise({ email: 'pas-un-email' } as any)).rejects.toThrow()
    expect(p.organisation.update).not.toHaveBeenCalled()
  })
})
