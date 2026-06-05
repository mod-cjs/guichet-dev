/**
 * @jest-environment node
 *
 * Tests du loader `loadHomeStats` — GUIC-235.
 * Prisma entièrement mocké : on vérifie que les 4 agrégations sont câblées
 * sur les bons modèles + bons filtres, et que la sortie respecte le DTO.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUtilisateurCount = jest.fn()
const mockOpportuniteCount = jest.fn()
const mockCentreFindMany   = jest.fn()
const mockCentreCount      = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: { count:    (...a: unknown[]) => mockUtilisateurCount(...a) },
    opportunite: { count:    (...a: unknown[]) => mockOpportuniteCount(...a) },
    centre:      {
      findMany: (...a: unknown[]) => mockCentreFindMany(...a),
      count:    (...a: unknown[]) => mockCentreCount(...a),
    },
  },
}))

// Import après mocks
import {
  loadHomeStats,
  loadHomeStatsSafe,
  FALLBACK_HOME_STATS,
  formatHomeStat,
} from '@/lib/loaders/home-stats'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('loadHomeStats', () => {
  it('agrège jeunes / opps / régions / centres dans le DTO HomeStats', async () => {
    mockUtilisateurCount.mockResolvedValue(22_695)
    mockOpportuniteCount.mockResolvedValue(1_240)
    mockCentreFindMany.mockResolvedValue([
      { region: 'Dakar' }, { region: 'Thies' }, { region: 'Saint_Louis' },
      { region: 'Kaolack' }, { region: 'Ziguinchor' }, { region: 'Tambacounda' },
      { region: 'Kolda' }, { region: 'Fatick' }, { region: 'Diourbel' },
      { region: 'Louga' }, { region: 'Matam' }, { region: 'Kaffrine' },
      { region: 'Kedougou' }, { region: 'Sedhiou' },
    ])
    mockCentreCount.mockResolvedValue(9)

    const stats = await loadHomeStats()
    expect(stats).toEqual({
      jeunesInscrits: 22_695,
      opportunitesActives: 1_240,
      regionsCouvertes: 14,
      centresActifs: 9,
    })
  })

  it('filtre Utilisateur sur statut actif + soft-delete null', async () => {
    mockUtilisateurCount.mockResolvedValue(0)
    mockOpportuniteCount.mockResolvedValue(0)
    mockCentreFindMany.mockResolvedValue([])
    mockCentreCount.mockResolvedValue(0)

    await loadHomeStats()
    expect(mockUtilisateurCount).toHaveBeenCalledWith({
      where: { statut: 'actif', deletedAt: null },
    })
  })

  it('filtre Opportunite sur publiee + deadline future ou null + non supprimée', async () => {
    mockUtilisateurCount.mockResolvedValue(0)
    mockOpportuniteCount.mockResolvedValue(0)
    mockCentreFindMany.mockResolvedValue([])
    mockCentreCount.mockResolvedValue(0)

    await loadHomeStats()
    const call = mockOpportuniteCount.mock.calls[0][0] as {
      where: { statut: string; deletedAt: null; OR: Array<{ deadline: unknown }> }
    }
    expect(call.where.statut).toBe('publiee')
    expect(call.where.deletedAt).toBeNull()
    expect(call.where.OR).toEqual([
      { deadline: null },
      { deadline: { gte: expect.any(Date) } },
    ])
  })

  it('regionsCouvertes utilise distinct sur Centre.region (actifs uniquement)', async () => {
    mockUtilisateurCount.mockResolvedValue(0)
    mockOpportuniteCount.mockResolvedValue(0)
    mockCentreFindMany.mockResolvedValue([{ region: 'Dakar' }, { region: 'Thies' }])
    mockCentreCount.mockResolvedValue(0)

    const stats = await loadHomeStats()
    expect(mockCentreFindMany).toHaveBeenCalledWith({
      where: { estActif: true },
      distinct: ['region'],
      select: { region: true },
    })
    expect(stats.regionsCouvertes).toBe(2)
  })

  it('centresActifs filtre Centre.estActif = true', async () => {
    mockUtilisateurCount.mockResolvedValue(0)
    mockOpportuniteCount.mockResolvedValue(0)
    mockCentreFindMany.mockResolvedValue([])
    mockCentreCount.mockResolvedValue(9)

    await loadHomeStats()
    expect(mockCentreCount).toHaveBeenCalledWith({ where: { estActif: true } })
  })
})

describe('loadHomeStatsSafe', () => {
  it('renvoie le fallback si Prisma jette', async () => {
    mockUtilisateurCount.mockRejectedValue(new Error('DB down'))
    mockOpportuniteCount.mockResolvedValue(0)
    mockCentreFindMany.mockResolvedValue([])
    mockCentreCount.mockResolvedValue(0)

    const stats = await loadHomeStatsSafe()
    expect(stats).toEqual(FALLBACK_HOME_STATS)
  })

  it('renvoie les vraies valeurs en mode nominal', async () => {
    mockUtilisateurCount.mockResolvedValue(100)
    mockOpportuniteCount.mockResolvedValue(50)
    mockCentreFindMany.mockResolvedValue([{ region: 'Dakar' }])
    mockCentreCount.mockResolvedValue(1)

    const stats = await loadHomeStatsSafe()
    expect(stats).toEqual({
      jeunesInscrits: 100,
      opportunitesActives: 50,
      regionsCouvertes: 1,
      centresActifs: 1,
    })
  })
})

describe('formatHomeStat', () => {
  it('formate les milliers à la française', () => {
    // U+202F narrow no-break space — match large
    expect(formatHomeStat(22_695)).toMatch(/^22\s695$/)
    expect(formatHomeStat(1_240)).toMatch(/^1\s240$/)
    expect(formatHomeStat(14)).toBe('14')
    expect(formatHomeStat(0)).toBe('0')
  })
})
