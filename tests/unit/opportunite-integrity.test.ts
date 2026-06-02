/**
 * @jest-environment node
 *
 * GUIC-183 — Tests `checkOpportuniteIntegrity` (M3 v2 — 178b/4 / spec §8.4 / DP4).
 *
 * Prisma mocké : on alimente `findMany` avec différentes formes de rows pour
 * vérifier que chaque cas de violation est correctement détecté.
 */
const mockFindMany = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: { opportunite: { findMany: (...a: unknown[]) => mockFindMany(...a) } },
}))

import { checkOpportuniteIntegrity } from '@/lib/services/opportunite-integrity'

function row(id: string, slug: string, opts: {
  typeSlug?: string | null
  emploi?: boolean
  stage?: boolean
  formation?: boolean
  bourse?: boolean
  concours?: boolean
  appelAProjets?: boolean
} = {}) {
  const sub = (b?: boolean) => (b ? { opportuniteId: id } : null)
  return {
    id,
    slug,
    typeRef: opts.typeSlug === undefined ? { slug: 'emploi' } : opts.typeSlug === null ? null : { slug: opts.typeSlug },
    emploi: sub(opts.emploi),
    stage: sub(opts.stage),
    formation: sub(opts.formation),
    bourse: sub(opts.bourse),
    concours: sub(opts.concours),
    appelAProjets: sub(opts.appelAProjets),
  }
}

beforeEach(() => jest.clearAllMocks())

describe('checkOpportuniteIntegrity', () => {
  it('retourne [] quand toutes les opportunités sont cohérentes', async () => {
    mockFindMany.mockResolvedValue([
      row('o1', 'a', { typeSlug: 'emploi', emploi: true }),
      row('o2', 'b', { typeSlug: 'stage', stage: true }),
      row('o3', 'c', { typeSlug: 'bourse', bourse: true }),
    ])
    expect(await checkOpportuniteIntegrity()).toEqual([])
  })

  it('flag TYPE_REF_MANQUANT quand typeRef est null', async () => {
    mockFindMany.mockResolvedValue([row('o1', 'a', { typeSlug: null, emploi: true })])
    const issues = await checkOpportuniteIntegrity()
    expect(issues).toHaveLength(1)
    expect(issues[0].reason).toBe('TYPE_REF_MANQUANT')
  })

  it('flag AUCUN_SOUS_TYPE quand aucun sous-type non null', async () => {
    mockFindMany.mockResolvedValue([row('o1', 'a', { typeSlug: 'emploi' })])
    const issues = await checkOpportuniteIntegrity()
    expect(issues[0]).toMatchObject({ reason: 'AUCUN_SOUS_TYPE', expected: 'emploi', actual: [] })
  })

  it('flag PLUSIEURS_SOUS_TYPES quand 2+ sous-types non null', async () => {
    mockFindMany.mockResolvedValue([
      row('o1', 'a', { typeSlug: 'emploi', emploi: true, stage: true }),
    ])
    const issues = await checkOpportuniteIntegrity()
    expect(issues[0]).toMatchObject({
      reason: 'PLUSIEURS_SOUS_TYPES',
      expected: 'emploi',
      actual: ['emploi', 'stage'],
    })
  })

  it('flag SOUS_TYPE_INCOHERENT quand sous-type ≠ typeRef.slug', async () => {
    mockFindMany.mockResolvedValue([
      row('o1', 'a', { typeSlug: 'emploi', stage: true }),
    ])
    const issues = await checkOpportuniteIntegrity()
    expect(issues[0]).toMatchObject({
      reason: 'SOUS_TYPE_INCOHERENT',
      expected: 'emploi',
      actual: ['stage'],
    })
  })

  it('filtre les rows soft-deleted via where', async () => {
    mockFindMany.mockResolvedValue([])
    await checkOpportuniteIntegrity()
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { deletedAt: null },
    }))
  })

  it('détecte correctement les 6 sous-types valides', async () => {
    mockFindMany.mockResolvedValue([
      row('o1', 'a', { typeSlug: 'appel_a_projets', appelAProjets: true }),
      row('o2', 'b', { typeSlug: 'concours', concours: true }),
      row('o3', 'c', { typeSlug: 'formation', formation: true }),
    ])
    expect(await checkOpportuniteIntegrity()).toEqual([])
  })
})
