/**
 * Dashboard loader (GUIC-206) — integration tests.
 *
 * On mocke Prisma pour valider les 4 sources branchées (recoOpps / events /
 * centres / tracker) et les transformations DTO côté serveur (date-box,
 * J-N, tone, mapping statut → étape tracker).
 */

const mockProfilFindUnique     = jest.fn()
const mockOpportuniteFindMany  = jest.fn()
const mockEvenementFindMany    = jest.fn()
const mockCentreFindMany       = jest.fn()
const mockCandidatureFindMany  = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune:  { findUnique: (...a: unknown[]) => mockProfilFindUnique(...a)   },
    opportunite:  { findMany:   (...a: unknown[]) => mockOpportuniteFindMany(...a) },
    evenement:    { findMany:   (...a: unknown[]) => mockEvenementFindMany(...a)   },
    centre:       { findMany:   (...a: unknown[]) => mockCentreFindMany(...a)      },
    candidature:  { findMany:   (...a: unknown[]) => mockCandidatureFindMany(...a) },
  },
}))

import { loadDashboardData } from '@/lib/loaders/dashboard'

const CJS_UID = 'uid-test'

describe('loadDashboardData', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockProfilFindUnique.mockResolvedValue({
      domainesInteret: ['Numérique', 'Agriculture'],
      utilisateur:     { region: 'Dakar' },
    })
    mockOpportuniteFindMany.mockResolvedValue([])
    mockEvenementFindMany.mockResolvedValue([])
    mockCentreFindMany.mockResolvedValue([])
    mockCandidatureFindMany.mockResolvedValue([])
  })

  it('lit le profil pour récupérer région et domaines d\'intérêt', async () => {
    await loadDashboardData(CJS_UID)
    expect(mockProfilFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cjsUid: CJS_UID } }),
    )
  })

  it('filtre les opportunités par domaines d\'intérêt et publiées', async () => {
    await loadDashboardData(CJS_UID)
    const call = mockOpportuniteFindMany.mock.calls[0][0]
    expect(call.where.statut).toBe('publiee')
    expect(call.where.deletedAt).toBeNull()
    // Whitelist enum Domaine : "Numérique" (accent) doit être normalisé vers "Numerique" (enum Prisma)
    expect(call.where.domaine).toEqual({ in: ['Numerique', 'Agriculture'] })
    expect(call.take).toBe(5)
  })

  it('renvoie des recoOpps mappées vers OppRecoCard (tag J-N, href, tone urgent si ≤7j)', async () => {
    const now = new Date()
    const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    mockOpportuniteFindMany.mockResolvedValueOnce([
      {
        id:        'opp-1',
        slug:      'bourse-agri',
        titre:     'Bourse Agri',
        type:      'Bourse',
        domaine:   'Agriculture',
        region:    'Tambacounda',
        organisation: 'ANIDA',
        organisationLibelle: null,
        deadline:  in3days,
      },
    ])

    const data = await loadDashboardData(CJS_UID)
    expect(data.recoOpps).toHaveLength(1)
    expect(data.recoOpps[0]).toMatchObject({
      id:    'opp-1',
      title: 'Bourse Agri',
      tone:  'urgent',
      href:  '/opportunites/bourse-agri',
    })
    expect(data.recoOpps[0].tag).toMatch(/J-3/)
  })

  it('renvoie events triés à venir avec date-box FR', async () => {
    const eventDate = new Date('2026-06-22T14:00:00Z')
    mockEvenementFindMany.mockResolvedValueOnce([
      {
        id:          'ev-1',
        titre:       'Atelier CV',
        dateDebut:   eventDate,
        lieu:        'CJS Tamba',
        estGratuit:  true,
        capaciteMax: 30,
      },
    ])

    const data = await loadDashboardData(CJS_UID)
    expect(data.events).toHaveLength(1)
    expect(data.events[0]).toMatchObject({
      id:    'ev-1',
      day:   eventDate.getDate(),
      title: 'Atelier CV',
      href:  '/agenda/ev-1',
    })
    expect(data.events[0].subtitle).toContain('CJS Tamba')
    expect(data.events[0].subtitle).toContain('Gratuit')

    const callArgs = mockEvenementFindMany.mock.calls[0][0]
    expect(callArgs.orderBy).toEqual({ dateDebut: 'asc' })
    expect(callArgs.take).toBe(3)
  })

  it('renvoie 3 centres filtrés par région du jeune', async () => {
    mockCentreFindMany.mockResolvedValueOnce([
      { id: 'c-1', slug: 'cjs-dakar',  nom: 'CJS Dakar',  adresse: 'Plateau', region: 'Dakar' },
      { id: 'c-2', slug: 'cjs-pikine', nom: 'CJS Pikine', adresse: 'Pikine',  region: 'Dakar' },
    ])
    const data = await loadDashboardData(CJS_UID)

    expect(data.centres).toHaveLength(2)
    expect(data.centres[0]).toMatchObject({
      id:       'c-1',
      name:     'CJS Dakar',
      address:  'Plateau',
      href:     '/centres/cjs-dakar',
    })
    const callArgs = mockCentreFindMany.mock.calls[0][0]
    expect(callArgs.where.region).toBe('Dakar')
    expect(callArgs.where.estActif).toBe(true)
    expect(callArgs.take).toBe(3)
  })

  it('mappe candidatures vers TrackerItem avec statut → step', async () => {
    mockCandidatureFindMany.mockResolvedValueOnce([
      {
        id:       'cand-1',
        statut:   'Vue',
        soumiseA: new Date('2026-05-14T09:00:00Z'),
        opportunite: { titre: 'Stage Data', deadline: null, domaine: 'Numérique' },
      },
      {
        id:       'cand-2',
        statut:   'Retenue',
        soumiseA: new Date('2026-04-02T09:00:00Z'),
        opportunite: { titre: 'Bourse UCAD', deadline: null, domaine: 'Education' },
      },
    ])

    const data = await loadDashboardData(CJS_UID)
    expect(data.tracker).toHaveLength(2)
    expect(data.tracker[0]).toMatchObject({
      id:          'cand-1',
      title:       'Stage Data',
      currentStep: 1,
      tone:        'yellow',
    })
    expect(data.tracker[1]).toMatchObject({
      id:          'cand-2',
      currentStep: 4,
      tone:        'green',
    })
  })

  it('sans domaines d\'intérêt, retombe sur publication récente (pas de filtre domaine)', async () => {
    mockProfilFindUnique.mockResolvedValueOnce({
      domainesInteret: null,
      utilisateur:     { region: null },
    })
    await loadDashboardData(CJS_UID)
    const call = mockOpportuniteFindMany.mock.calls[0][0]
    expect(call.where.domaine).toBeUndefined()
  })

  it('sans région, ne filtre pas les centres par région', async () => {
    mockProfilFindUnique.mockResolvedValueOnce({
      domainesInteret: [],
      utilisateur:     { region: null },
    })
    await loadDashboardData(CJS_UID)
    const call = mockCentreFindMany.mock.calls[0][0]
    expect(call.where.region).toBeUndefined()
  })
})
