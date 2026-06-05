/**
 * @jest-environment node
 *
 * GUIC-232 — Unit tests pour `checkProfilCompletude`.
 */

const mockFindUnique = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
  },
}))

import { checkProfilCompletude } from '@/lib/profil-completude'

const FULL_SESSION = {
  prenom: 'Awa',
  nom: 'Diop',
  email: 'awa@example.com',
  telephone: '+221770000000',
  region: 'Dakar',
}

const FULL_PROFIL = {
  niveauEtude: 'licence',
  situationEmploi: 'etudiant',
  domainesInteret: ['Agriculture'],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFindUnique.mockResolvedValue(FULL_PROFIL)
})

describe('checkProfilCompletude', () => {
  it('marque le profil complet quand identité + profil OK', async () => {
    const res = await checkProfilCompletude('uid-1', FULL_SESSION)
    expect(res).toEqual({ complet: true, missing: [] })
  })

  it('détecte les champs identité manquants (session)', async () => {
    const res = await checkProfilCompletude('uid-1', {
      ...FULL_SESSION,
      telephone: null,
      region: null,
    })
    expect(res.complet).toBe(false)
    expect(res.missing).toEqual(expect.arrayContaining(['telephone', 'region']))
  })

  it('détecte un profil totalement absent', async () => {
    mockFindUnique.mockResolvedValue(null)
    const res = await checkProfilCompletude('uid-1', FULL_SESSION)
    expect(res.complet).toBe(false)
    expect(res.missing).toEqual([
      'niveauEtude',
      'situationEmploi',
      'domainesInteret',
    ])
  })

  it('détecte domainesInteret vide', async () => {
    mockFindUnique.mockResolvedValue({ ...FULL_PROFIL, domainesInteret: [] })
    const res = await checkProfilCompletude('uid-1', FULL_SESSION)
    expect(res.complet).toBe(false)
    expect(res.missing).toEqual(['domainesInteret'])
  })

  it('tolère domainesInteret non-array (Json malformé)', async () => {
    mockFindUnique.mockResolvedValue({ ...FULL_PROFIL, domainesInteret: 'oups' })
    const res = await checkProfilCompletude('uid-1', FULL_SESSION)
    expect(res.complet).toBe(false)
    expect(res.missing).toEqual(['domainesInteret'])
  })
})
