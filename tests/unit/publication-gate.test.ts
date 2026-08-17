/**
 * @jest-environment node
 *
 * GUIC-706 (Phase 2b) — gate de PUBLICATION (spec §4) : un recruteur peut publier pour une
 * org ssi les TROIS axes sont au vert — Organisation.statut=active ET
 * MembreOrganisation.statut=actif ET Utilisateur.statut=actif. Sinon, raison typée.
 */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organisation: { findUnique: jest.fn() },
    utilisateur: { findUnique: jest.fn() },
    membreOrganisation: { findUnique: jest.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { verifierGatePublication } from '@/lib/decouplage/publication-gate'

const mp = prisma as unknown as {
  organisation: { findUnique: jest.Mock }
  utilisateur: { findUnique: jest.Mock }
  membreOrganisation: { findUnique: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
  mp.organisation.findUnique.mockResolvedValue({ statut: 'active' })
  mp.utilisateur.findUnique.mockResolvedValue({ statut: 'actif' })
  mp.membreOrganisation.findUnique.mockResolvedValue({ statut: 'actif' })
})

describe('GUIC-706 — verifierGatePublication', () => {
  it('trois axes verts → ok', async () => {
    await expect(verifierGatePublication('u1', 'org1')).resolves.toEqual({ ok: true })
  })

  it('org suspendue → ORG_SUSPENDUE', async () => {
    mp.organisation.findUnique.mockResolvedValue({ statut: 'suspendue' })
    await expect(verifierGatePublication('u1', 'org1')).resolves.toEqual({ ok: false, raison: 'ORG_SUSPENDUE' })
  })

  it('personne inactive → PERSONNE_INACTIVE', async () => {
    mp.utilisateur.findUnique.mockResolvedValue({ statut: 'inactif' })
    await expect(verifierGatePublication('u1', 'org1')).resolves.toEqual({ ok: false, raison: 'PERSONNE_INACTIVE' })
  })

  it('pas membre → NON_MEMBRE', async () => {
    mp.membreOrganisation.findUnique.mockResolvedValue(null)
    await expect(verifierGatePublication('u1', 'org1')).resolves.toEqual({ ok: false, raison: 'NON_MEMBRE' })
  })

  it('membre révoqué → MEMBRE_INACTIF', async () => {
    mp.membreOrganisation.findUnique.mockResolvedValue({ statut: 'revoke' })
    await expect(verifierGatePublication('u1', 'org1')).resolves.toEqual({ ok: false, raison: 'MEMBRE_INACTIF' })
  })

  it('org introuvable → ORG_SUSPENDUE (fail-closed)', async () => {
    mp.organisation.findUnique.mockResolvedValue(null)
    await expect(verifierGatePublication('u1', 'org1')).resolves.toMatchObject({ ok: false })
  })
})
