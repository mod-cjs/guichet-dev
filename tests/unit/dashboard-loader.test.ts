/**
 * @jest-environment node
 *
 * Tests unitaires de lib/dashboard-loader.ts (compteurs + flux activités).
 * Prisma entièrement mocké.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockCandidatureCount  = jest.fn()
const mockInscriptionCount  = jest.fn()
const mockFavoriCount       = jest.fn()
const mockCertificatCount   = jest.fn()
const mockExperienceCount   = jest.fn()
const mockDiplomeCount      = jest.fn()

const mockCandidatureFindMany = jest.fn()
const mockInscriptionFindMany = jest.fn()
const mockFavoriFindMany      = jest.fn()
const mockCertificatFindMany  = jest.fn()
const mockExperienceFindMany  = jest.fn()
const mockDiplomeFindMany     = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    candidature:          { count: (...a: unknown[]) => mockCandidatureCount(...a),  findMany: (...a: unknown[]) => mockCandidatureFindMany(...a) },
    inscriptionEvenement: { count: (...a: unknown[]) => mockInscriptionCount(...a),  findMany: (...a: unknown[]) => mockInscriptionFindMany(...a) },
    ressourceFavorite:    { count: (...a: unknown[]) => mockFavoriCount(...a),       findMany: (...a: unknown[]) => mockFavoriFindMany(...a) },
    certificatMoodle:     { count: (...a: unknown[]) => mockCertificatCount(...a),   findMany: (...a: unknown[]) => mockCertificatFindMany(...a) },
    experience:           { count: (...a: unknown[]) => mockExperienceCount(...a),   findMany: (...a: unknown[]) => mockExperienceFindMany(...a) },
    diplome:              { count: (...a: unknown[]) => mockDiplomeCount(...a),      findMany: (...a: unknown[]) => mockDiplomeFindMany(...a) },
  },
}))

// Import après mocks
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadDashboardCounts, loadRecentActivity } = require('@/lib/dashboard-loader')

// ── Helpers ────────────────────────────────────────────────────────────────

const D = (iso: string) => new Date(iso)

beforeEach(() => {
  jest.clearAllMocks()
  // Par défaut : sources vides
  mockCandidatureFindMany.mockResolvedValue([])
  mockInscriptionFindMany.mockResolvedValue([])
  mockFavoriFindMany.mockResolvedValue([])
  mockCertificatFindMany.mockResolvedValue([])
  mockExperienceFindMany.mockResolvedValue([])
  mockDiplomeFindMany.mockResolvedValue([])
})

// ── loadDashboardCounts ────────────────────────────────────────────────────

describe('loadDashboardCounts', () => {
  it('agrège les 6 compteurs en parallèle', async () => {
    mockCandidatureCount.mockResolvedValue(3)
    mockInscriptionCount.mockResolvedValue(2)
    mockFavoriCount.mockResolvedValue(7)
    mockCertificatCount.mockResolvedValue(1)
    mockExperienceCount.mockResolvedValue(4)
    mockDiplomeCount.mockResolvedValue(2)

    const counts = await loadDashboardCounts('uid-abc')

    expect(counts).toEqual({
      candidatures:   3,
      eventsInscrits: 2,
      favoris:        7,
      certificats:    1,
      experiences:    4,
      diplomes:       2,
    })
  })

  it('filtre par cjsUid (utilisateur direct) ou par profil.cjsUid (relations indirectes)', async () => {
    mockCandidatureCount.mockResolvedValue(0)
    mockInscriptionCount.mockResolvedValue(0)
    mockFavoriCount.mockResolvedValue(0)
    mockCertificatCount.mockResolvedValue(0)
    mockExperienceCount.mockResolvedValue(0)
    mockDiplomeCount.mockResolvedValue(0)

    await loadDashboardCounts('uid-xyz')

    expect(mockCandidatureCount).toHaveBeenCalledWith({ where: { cjsUid: 'uid-xyz' } })
    expect(mockInscriptionCount).toHaveBeenCalledWith({ where: { cjsUid: 'uid-xyz' } })
    expect(mockFavoriCount).toHaveBeenCalledWith({ where: { cjsUid: 'uid-xyz' } })
    // Pour les modèles liés au profil (pas directement à Utilisateur), filtre via la relation
    expect(mockCertificatCount).toHaveBeenCalledWith({ where: { profil: { cjsUid: 'uid-xyz' } } })
    expect(mockExperienceCount).toHaveBeenCalledWith({ where: { profil: { cjsUid: 'uid-xyz' } } })
    expect(mockDiplomeCount).toHaveBeenCalledWith({ where: { profil: { cjsUid: 'uid-xyz' } } })
  })
})

// ── loadRecentActivity ─────────────────────────────────────────────────────

describe('loadRecentActivity', () => {
  it('merge les sources et trie par date DESC', async () => {
    mockCandidatureFindMany.mockResolvedValue([
      { id: 'c1', soumiseA: D('2026-05-10T10:00:00Z'), statut: 'En_attente', opportunite: { titre: 'Stage Backend' } },
    ])
    mockDiplomeFindMany.mockResolvedValue([
      { id: 'd1', createdAt: D('2026-05-15T10:00:00Z'), intitule: 'Licence Informatique', anneeObtention: 2024 },
    ])
    mockExperienceFindMany.mockResolvedValue([
      { id: 'e1', createdAt: D('2026-05-12T10:00:00Z'), poste: 'Dev Junior', organisation: 'CJS' },
    ])

    const items = await loadRecentActivity('uid-abc', 10)

    expect(items).toHaveLength(3)
    expect(items[0].type).toBe('diplome_ajoute')
    expect(items[1].type).toBe('experience_ajoutee')
    expect(items[2].type).toBe('candidature')
    expect(items[0].date).toBe('2026-05-15T10:00:00.000Z')
  })

  it('respecte le limit après merge global', async () => {
    mockCandidatureFindMany.mockResolvedValue([
      { id: 'c1', soumiseA: D('2026-05-10T10:00:00Z'), statut: 'En_attente', opportunite: { titre: 'A' } },
      { id: 'c2', soumiseA: D('2026-05-11T10:00:00Z'), statut: 'Vue',        opportunite: { titre: 'B' } },
      { id: 'c3', soumiseA: D('2026-05-12T10:00:00Z'), statut: 'Retenue',    opportunite: { titre: 'C' } },
    ])
    mockExperienceFindMany.mockResolvedValue([
      { id: 'e1', createdAt: D('2026-05-13T10:00:00Z'), poste: 'X', organisation: 'Y' },
      { id: 'e2', createdAt: D('2026-05-14T10:00:00Z'), poste: 'X', organisation: 'Y' },
    ])

    const items = await loadRecentActivity('uid-abc', 2)
    expect(items).toHaveLength(2)
    expect(items[0].date).toBe('2026-05-14T10:00:00.000Z')
    expect(items[1].date).toBe('2026-05-13T10:00:00.000Z')
  })

  it('clamp limit entre 1 et 20 (défaut 10)', async () => {
    await loadRecentActivity('uid-abc', 0)
    expect(mockCandidatureFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: expect.any(Number) }))
    const callTake = (mockCandidatureFindMany.mock.calls[0][0] as { take: number }).take
    expect(callTake).toBeGreaterThanOrEqual(1)

    jest.clearAllMocks()
    mockCandidatureFindMany.mockResolvedValue([])
    mockInscriptionFindMany.mockResolvedValue([])
    mockFavoriFindMany.mockResolvedValue([])
    mockCertificatFindMany.mockResolvedValue([])
    mockExperienceFindMany.mockResolvedValue([])
    mockDiplomeFindMany.mockResolvedValue([])

    await loadRecentActivity('uid-abc', 999)
    const items999 = await loadRecentActivity('uid-abc', 999)
    expect(items999.length).toBeLessThanOrEqual(20)
  })

  it("mappe chaque source vers le bon ActivityItem discriminé", async () => {
    mockCandidatureFindMany.mockResolvedValue([
      { id: 'c1', soumiseA: D('2026-05-10T10:00:00Z'), statut: 'Retenue', opportunite: { titre: 'Stage' } },
    ])
    mockInscriptionFindMany.mockResolvedValue([
      { id: 'i1', inscritA: D('2026-05-09T10:00:00Z'), evenement: { titre: 'Forum', dateDebut: D('2026-06-01T08:00:00Z') } },
    ])
    mockFavoriFindMany.mockResolvedValue([
      { cjsUid: 'uid-abc', ressourceId: 'r1', createdAt: D('2026-05-08T10:00:00Z'), ressource: { titre: 'Guide CV' } },
    ])
    mockExperienceFindMany.mockResolvedValue([
      { id: 'e1', createdAt: D('2026-05-07T10:00:00Z'), poste: 'Dev', organisation: 'CJS' },
    ])
    mockDiplomeFindMany.mockResolvedValue([
      { id: 'd1', createdAt: D('2026-05-06T10:00:00Z'), intitule: 'Licence', anneeObtention: 2024 },
    ])
    mockCertificatFindMany.mockResolvedValue([
      { id: 'cert1', obtenuLe: D('2026-05-05T10:00:00Z'), formation: 'Excel', urlCertificat: 'https://example/cert' },
    ])

    const items = await loadRecentActivity('uid-abc', 20)

    expect(items.find((i: { type: string }) => i.type === 'candidature')).toMatchObject({
      type: 'candidature', id: 'c1', opportuniteTitre: 'Stage', statut: 'Retenue',
    })
    expect(items.find((i: { type: string }) => i.type === 'inscription_evenement')).toMatchObject({
      type: 'inscription_evenement', id: 'i1', evenementTitre: 'Forum',
    })
    expect(items.find((i: { type: string }) => i.type === 'favori_ressource')).toMatchObject({
      type: 'favori_ressource', ressourceTitre: 'Guide CV',
    })
    expect(items.find((i: { type: string }) => i.type === 'experience_ajoutee')).toMatchObject({
      type: 'experience_ajoutee', poste: 'Dev', organisation: 'CJS',
    })
    expect(items.find((i: { type: string }) => i.type === 'diplome_ajoute')).toMatchObject({
      type: 'diplome_ajoute', intitule: 'Licence', anneeObtention: 2024,
    })
    expect(items.find((i: { type: string }) => i.type === 'certificat_recu')).toMatchObject({
      type: 'certificat_recu', intitule: 'Excel', urlCertificat: 'https://example/cert',
    })
  })

  it("retourne une liste vide quand aucune activité n'existe", async () => {
    const items = await loadRecentActivity('uid-abc', 10)
    expect(items).toEqual([])
  })
})
