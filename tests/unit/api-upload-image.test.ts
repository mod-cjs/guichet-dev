/**
 * @jest-environment node
 *
 * GUIC-504 — POST /api/upload/image (image de l'éditeur riche).
 * Réservé aux producteurs de contenu : admin OU recruteur. Stockage Blob PUBLIC.
 */
const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))
const mockPut = jest.fn()
jest.mock('@vercel/blob', () => ({ put: (...a: unknown[]) => mockPut(...a) }))

import { NextRequest } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/upload/image/route')

function jpegFile(name = 'img.jpg', sizeBytes = 1024): File {
  const header = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
  const body = new Uint8Array(Math.max(0, sizeBytes - header.length))
  return new File([header, body], name, { type: 'image/jpeg' })
}
function reqWith(file?: File): NextRequest {
  const fd = new FormData()
  if (file) fd.append('file', file, file.name)
  return new NextRequest('http://localhost/api/upload/image', { method: 'POST', body: fd })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPut.mockResolvedValue({ url: 'https://store.public.blob.vercel-storage.com/editor-image/u/x.jpg' })
})

describe('GUIC-504 — POST /api/upload/image (autorisation)', () => {
  it('401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await route.POST(reqWith(jpegFile()))
    expect(res.status).toBe(401)
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('403 pour un rôle non éditorial (bénéficiaire)', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    const res = await route.POST(reqWith(jpegFile()))
    expect(res.status).toBe(403)
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('admin : upload OK → data.url (blob public)', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'admin-1', roles: ['admin'] })
    const res = await route.POST(reqWith(jpegFile()))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.url).toMatch(/public\.blob\.vercel-storage\.com/)
    expect(mockPut).toHaveBeenCalledTimes(1)
    // Stockage public (rendu <img>).
    expect(mockPut.mock.calls[0][2]).toMatchObject({ access: 'public' })
  })

  it('recruteur : autorisé', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'rec-1', roles: ['recruteur'] })
    const res = await route.POST(reqWith(jpegFile()))
    expect(res.status).toBe(200)
    expect(mockPut).toHaveBeenCalledTimes(1)
  })

  it('400 si aucun fichier fourni', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'admin-1', roles: ['admin'] })
    const res = await route.POST(reqWith())
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(mockPut).not.toHaveBeenCalled()
  })
})
