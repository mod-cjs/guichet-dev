/**
 * @jest-environment node
 *
 * Tests unitaires de la routine cleanupCvOrphans (GUIC-231).
 */

export {} // fichier traité comme module (évite la collision de scope global avec d'autres tests)

const mockList = jest.fn()
const mockDel = jest.fn()
jest.mock('@vercel/blob', () => ({
  list: (...a: unknown[]) => mockList(...a),
  del: (...a: unknown[]) => mockDel(...a),
}))

const mockFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    candidature: { findMany: (...a: unknown[]) => mockFindMany(...a) },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cleanupCvOrphans } = require('@/lib/cleanup-cv-orphans')

function makeBlob(url: string, ageMs: number) {
  return {
    url,
    pathname: url.replace(/^https?:\/\/[^/]+\//, ''),
    uploadedAt: new Date(Date.now() - ageMs),
    size: 1024,
  }
}

const HOUR = 60 * 60 * 1000

beforeEach(() => {
  jest.clearAllMocks()
  process.env.BLOB_READ_WRITE_TOKEN = 'token-test'
})

describe('cleanupCvOrphans', () => {
  it('retourne 0 orphelin si tous les blobs sont référencés', async () => {
    mockList.mockResolvedValueOnce({
      blobs: [
        makeBlob('https://blob.vercel/cv/a.pdf', 48 * HOUR),
        makeBlob('https://blob.vercel/cv/b.pdf', 48 * HOUR),
      ],
      hasMore: false,
    })
    mockFindMany.mockResolvedValueOnce([
      { cvUrl: 'https://blob.vercel/cv/a.pdf' },
      { cvUrl: 'https://blob.vercel/cv/b.pdf' },
    ])

    const r = await cleanupCvOrphans({ apply: true })
    expect(r.scanned).toBe(2)
    expect(r.orphans).toBe(0)
    expect(r.deleted).toBe(0)
    expect(mockDel).not.toHaveBeenCalled()
  })

  it('détecte les orphelins et appelle del() en mode apply', async () => {
    mockList.mockResolvedValueOnce({
      blobs: [
        makeBlob('https://blob.vercel/cv/a.pdf', 48 * HOUR), // orphelin
        makeBlob('https://blob.vercel/cv/b.pdf', 48 * HOUR), // référencé
        makeBlob('https://blob.vercel/cv/c.pdf', 48 * HOUR), // orphelin
      ],
      hasMore: false,
    })
    mockFindMany.mockResolvedValueOnce([{ cvUrl: 'https://blob.vercel/cv/b.pdf' }])

    const r = await cleanupCvOrphans({ apply: true })
    expect(r.scanned).toBe(3)
    expect(r.orphans).toBe(2)
    expect(r.deleted).toBe(2)
    expect(mockDel).toHaveBeenCalledTimes(2)
    expect(mockDel).toHaveBeenCalledWith('https://blob.vercel/cv/a.pdf', { token: 'token-test' })
    expect(mockDel).toHaveBeenCalledWith('https://blob.vercel/cv/c.pdf', { token: 'token-test' })
  })

  it('en dry-run, ne supprime rien mais liste les orphelins', async () => {
    mockList.mockResolvedValueOnce({
      blobs: [makeBlob('https://blob.vercel/cv/x.pdf', 48 * HOUR)],
      hasMore: false,
    })
    mockFindMany.mockResolvedValueOnce([])

    const r = await cleanupCvOrphans({ apply: false })
    expect(r.orphans).toBe(1)
    expect(r.deleted).toBe(0)
    expect(r.orphanUrls).toEqual(['https://blob.vercel/cv/x.pdf'])
    expect(mockDel).not.toHaveBeenCalled()
  })

  it('ignore les blobs trop récents (< 24 h)', async () => {
    mockList.mockResolvedValueOnce({
      blobs: [
        makeBlob('https://blob.vercel/cv/fresh.pdf', 2 * HOUR), // trop récent
        makeBlob('https://blob.vercel/cv/old.pdf', 48 * HOUR), // assez vieux
      ],
      hasMore: false,
    })
    mockFindMany.mockResolvedValueOnce([])

    const r = await cleanupCvOrphans({ apply: true })
    expect(r.scanned).toBe(2)
    expect(r.orphans).toBe(1)
    expect(r.deleted).toBe(1)
    expect(mockDel).toHaveBeenCalledWith('https://blob.vercel/cv/old.pdf', { token: 'token-test' })
  })

  it('comptabilise les erreurs de del() sans interrompre la boucle', async () => {
    mockList.mockResolvedValueOnce({
      blobs: [
        makeBlob('https://blob.vercel/cv/a.pdf', 48 * HOUR),
        makeBlob('https://blob.vercel/cv/b.pdf', 48 * HOUR),
      ],
      hasMore: false,
    })
    mockFindMany.mockResolvedValueOnce([])
    mockDel.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined)

    const r = await cleanupCvOrphans({ apply: true })
    expect(r.orphans).toBe(2)
    expect(r.deleted).toBe(1)
    expect(r.errors).toBe(1)
  })

  it('parcourt toutes les pages via cursor', async () => {
    mockList
      .mockResolvedValueOnce({
        blobs: [makeBlob('https://blob.vercel/cv/p1.pdf', 48 * HOUR)],
        hasMore: true,
        cursor: 'next-cursor',
      })
      .mockResolvedValueOnce({
        blobs: [makeBlob('https://blob.vercel/cv/p2.pdf', 48 * HOUR)],
        hasMore: false,
      })
    mockFindMany.mockResolvedValueOnce([])

    const r = await cleanupCvOrphans({ apply: false })
    expect(mockList).toHaveBeenCalledTimes(2)
    expect(mockList).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'next-cursor' }),
    )
    expect(r.scanned).toBe(2)
    expect(r.orphans).toBe(2)
  })
})
