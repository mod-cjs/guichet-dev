/**
 * @jest-environment node
 *
 * Tests unitaires de la routine cleanupCvOrphans (GUIC-231, GUIC-565).
 *
 * GUIC-565 — le nettoyage passe désormais par l'abstraction `@/lib/storage` (et non plus
 * `@vercel/blob`). On mocke DONC `@/lib/storage`, pas un détail d'implémentation. Point clé de la
 * purge CDP : la SUPPRESSION est routée par la FORME de chaque référence (`stockagePour`) —
 * un orphelin encore sur Vercel doit être supprimé par Vercel, un s3:// par MinIO. Le test des
 * références mixtes le garantit.
 */

export {} // module isolé (évite la collision de scope global)

const mockLister = jest.fn()
const mockSupprimer = jest.fn()
// `stockagePour` enregistre la référence reçue → on vérifie le routage par référence.
const mockStockagePour = jest.fn((..._a: unknown[]) => ({ supprimer: mockSupprimer }))
jest.mock('@/lib/storage', () => ({
  stockage: () => ({ lister: (...a: unknown[]) => mockLister(...a) }),
  stockagePour: (...a: unknown[]) => mockStockagePour(...a),
}))

const mockFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    candidature: { findMany: (...a: unknown[]) => mockFindMany(...a) },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cleanupCvOrphans } = require('@/lib/cleanup-cv-orphans')

const HOUR = 60 * 60 * 1000

/** Objet tel que renvoyé par `stockage().lister()` (nouvelle forme du port). */
function makeObjet(reference: string, ageMs: number) {
  return {
    reference,
    chemin: reference.replace(/^(https?:\/\/[^/]+\/|s3:\/\/[^/]+\/)/, ''),
    taille: 1024,
    deposeLe: new Date(Date.now() - ageMs),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('cleanupCvOrphans', () => {
  it('retourne 0 orphelin si tous les objets sont référencés', async () => {
    mockLister.mockResolvedValueOnce({
      objets: [makeObjet('s3://guichet/cv/a.pdf', 48 * HOUR), makeObjet('s3://guichet/cv/b.pdf', 48 * HOUR)],
    })
    mockFindMany.mockResolvedValueOnce([{ cvUrl: 's3://guichet/cv/a.pdf' }, { cvUrl: 's3://guichet/cv/b.pdf' }])

    const r = await cleanupCvOrphans({ apply: true })
    expect(r.scanned).toBe(2)
    expect(r.orphans).toBe(0)
    expect(r.deleted).toBe(0)
    expect(mockSupprimer).not.toHaveBeenCalled()
  })

  it('détecte les orphelins et les supprime en mode apply', async () => {
    mockLister.mockResolvedValueOnce({
      objets: [
        makeObjet('s3://guichet/cv/a.pdf', 48 * HOUR), // orphelin
        makeObjet('s3://guichet/cv/b.pdf', 48 * HOUR), // référencé
        makeObjet('s3://guichet/cv/c.pdf', 48 * HOUR), // orphelin
      ],
    })
    mockFindMany.mockResolvedValueOnce([{ cvUrl: 's3://guichet/cv/b.pdf' }])

    const r = await cleanupCvOrphans({ apply: true })
    expect(r.scanned).toBe(3)
    expect(r.orphans).toBe(2)
    expect(r.deleted).toBe(2)
    expect(mockSupprimer).toHaveBeenCalledTimes(2)
    expect(mockSupprimer).toHaveBeenCalledWith('s3://guichet/cv/a.pdf')
    expect(mockSupprimer).toHaveBeenCalledWith('s3://guichet/cv/c.pdf')
  })

  it('route la suppression par la FORME de chaque référence (mixte s3:// + Vercel hérité)', async () => {
    mockLister.mockResolvedValueOnce({
      objets: [
        makeObjet('s3://guichet/cv/neuf.pdf', 48 * HOUR),
        makeObjet('https://abc.vercel-storage.com/cv/herite.pdf', 48 * HOUR),
      ],
    })
    mockFindMany.mockResolvedValueOnce([]) // les deux sont orphelins

    const r = await cleanupCvOrphans({ apply: true })
    expect(r.deleted).toBe(2)
    // Chaque référence est passée à stockagePour → chacune est routée vers SON fournisseur.
    expect(mockStockagePour).toHaveBeenCalledWith('s3://guichet/cv/neuf.pdf')
    expect(mockStockagePour).toHaveBeenCalledWith('https://abc.vercel-storage.com/cv/herite.pdf')
  })

  it('en dry-run, ne supprime rien mais liste les orphelins', async () => {
    mockLister.mockResolvedValueOnce({ objets: [makeObjet('s3://guichet/cv/x.pdf', 48 * HOUR)] })
    mockFindMany.mockResolvedValueOnce([])

    const r = await cleanupCvOrphans({ apply: false })
    expect(r.orphans).toBe(1)
    expect(r.deleted).toBe(0)
    expect(r.orphanUrls).toEqual(['s3://guichet/cv/x.pdf'])
    expect(mockSupprimer).not.toHaveBeenCalled()
  })

  it('ignore les objets trop récents (< 24 h)', async () => {
    mockLister.mockResolvedValueOnce({
      objets: [
        makeObjet('s3://guichet/cv/fresh.pdf', 2 * HOUR), // trop récent
        makeObjet('s3://guichet/cv/old.pdf', 48 * HOUR), // assez vieux
      ],
    })
    mockFindMany.mockResolvedValueOnce([])

    const r = await cleanupCvOrphans({ apply: true })
    expect(r.scanned).toBe(2)
    expect(r.orphans).toBe(1)
    expect(r.deleted).toBe(1)
    expect(mockSupprimer).toHaveBeenCalledWith('s3://guichet/cv/old.pdf')
  })

  it('comptabilise les erreurs de suppression sans interrompre la boucle', async () => {
    mockLister.mockResolvedValueOnce({
      objets: [makeObjet('s3://guichet/cv/a.pdf', 48 * HOUR), makeObjet('s3://guichet/cv/b.pdf', 48 * HOUR)],
    })
    mockFindMany.mockResolvedValueOnce([])
    mockSupprimer.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined)

    const r = await cleanupCvOrphans({ apply: true })
    expect(r.orphans).toBe(2)
    expect(r.deleted).toBe(1)
    expect(r.errors).toBe(1)
  })

  it('parcourt toutes les pages via le curseur', async () => {
    mockLister
      .mockResolvedValueOnce({ objets: [makeObjet('s3://guichet/cv/p1.pdf', 48 * HOUR)], curseur: 'next-cursor' })
      .mockResolvedValueOnce({ objets: [makeObjet('s3://guichet/cv/p2.pdf', 48 * HOUR)] })
    mockFindMany.mockResolvedValueOnce([])

    const r = await cleanupCvOrphans({ apply: false })
    expect(mockLister).toHaveBeenCalledTimes(2)
    expect(mockLister).toHaveBeenLastCalledWith(expect.objectContaining({ curseur: 'next-cursor' }))
    expect(r.scanned).toBe(2)
    expect(r.orphans).toBe(2)
  })
})
