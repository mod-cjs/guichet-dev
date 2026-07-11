/**
 * @jest-environment node
 *
 * GUIC-488 (US-6) — Notification in-app au recruteur à la réception d'une candidature.
 * Destinataire = `Opportunite.recruteurUid` en priorité, sinon `org.cjsUid`. Fail-soft.
 */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: { findUnique: jest.fn() },
    utilisateur: { findUnique: jest.fn() },
    notification: { create: jest.fn() },
  },
}))
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }))

import { prisma } from '@/lib/prisma'
import { notifyRecruteurNouvelleCandidature } from '@/lib/notifications/recruteur'

const p = prisma as unknown as {
  opportunite: { findUnique: jest.Mock }
  utilisateur: { findUnique: jest.Mock }
  notification: { create: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
  p.notification.create.mockResolvedValue({})
  // GUIC-513 — pas de préférence enregistrée → notification envoyée par défaut.
  p.utilisateur.findUnique.mockResolvedValue(null)
})

describe('GUIC-488 — notifyRecruteurNouvelleCandidature', () => {
  it('recruteurUid présent → notifie ce recruteur (type Candidature)', async () => {
    p.opportunite.findUnique.mockResolvedValue({ titre: 'Dev web', recruteurUid: 'rec-1', org: { cjsUid: 'org-owner' } })
    await notifyRecruteurNouvelleCandidature('opp-1', 'Awa Ndiaye')
    expect(p.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cjsUid: 'rec-1', type: 'Candidature' }) }),
    )
  })

  it('pas de recruteurUid → fallback sur org.cjsUid', async () => {
    p.opportunite.findUnique.mockResolvedValue({ titre: 'Dev web', recruteurUid: null, org: { cjsUid: 'org-owner' } })
    await notifyRecruteurNouvelleCandidature('opp-1', 'Awa Ndiaye')
    expect(p.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cjsUid: 'org-owner' }) }),
    )
  })

  it('opportunité introuvable → no-op', async () => {
    p.opportunite.findUnique.mockResolvedValue(null)
    await notifyRecruteurNouvelleCandidature('opp-x', 'Awa')
    expect(p.notification.create).not.toHaveBeenCalled()
  })

  it('aucun destinataire (ni recruteurUid ni org) → no-op', async () => {
    p.opportunite.findUnique.mockResolvedValue({ titre: 'Dev', recruteurUid: null, org: null })
    await notifyRecruteurNouvelleCandidature('opp-1', 'Awa')
    expect(p.notification.create).not.toHaveBeenCalled()
  })

  it('erreur DB à la création → ne throw pas (fail-soft)', async () => {
    p.opportunite.findUnique.mockResolvedValue({ titre: 'Dev', recruteurUid: 'rec-1', org: null })
    p.notification.create.mockRejectedValue(new Error('db'))
    await expect(notifyRecruteurNouvelleCandidature('opp-1', 'Awa')).resolves.toBeUndefined()
  })
})
