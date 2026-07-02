/**
 * @jest-environment node
 *
 * GUIC-489 (US-7) — Recherche de candidat : `getRecruteurCandidatures` filtre par nom,
 * en restant borné aux candidats des offres du recruteur (via `offreWhere`).
 */
jest.mock('@/lib/prisma', () => ({ prisma: { candidature: { findMany: jest.fn() } } }))

import { prisma } from '@/lib/prisma'
import { getRecruteurCandidatures } from '@/lib/loaders/recruteur'

const p = prisma as unknown as { candidature: { findMany: jest.Mock } }

beforeEach(() => {
  jest.clearAllMocks()
  p.candidature.findMany.mockResolvedValue([])
})

describe('GUIC-489 — getRecruteurCandidatures (recherche)', () => {
  it('q → filtre sur prénom/nom du candidat (contains)', async () => {
    await getRecruteurCandidatures('rec-1', 'org-1', undefined, 'awa')
    const where = p.candidature.findMany.mock.calls[0][0].where
    // Toujours borné aux offres du recruteur.
    expect(where.opportunite).toBeTruthy()
    expect(where.utilisateur.OR).toEqual(
      expect.arrayContaining([{ prenom: { contains: 'awa' } }, { nom: { contains: 'awa' } }]),
    )
  })

  it('sans q → aucun filtre utilisateur', async () => {
    await getRecruteurCandidatures('rec-1', 'org-1')
    const where = p.candidature.findMany.mock.calls[0][0].where
    expect(where.utilisateur).toBeUndefined()
  })

  it('q vide/espaces → ignoré (pas de filtre)', async () => {
    await getRecruteurCandidatures('rec-1', 'org-1', undefined, '   ')
    const where = p.candidature.findMany.mock.calls[0][0].where
    expect(where.utilisateur).toBeUndefined()
  })

  it('q + statut combinés', async () => {
    await getRecruteurCandidatures('rec-1', 'org-1', 'Retenue', 'diop')
    const where = p.candidature.findMany.mock.calls[0][0].where
    expect(where.statut).toBe('Retenue')
    expect(where.utilisateur.OR).toBeTruthy()
  })
})
