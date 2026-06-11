/**
 * @jest-environment node
 *
 * Tests `POST /api/profil/photo` (GUIC-360).
 */

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...a: unknown[]) => mockGetSession(...a),
}))
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

const mockPut = jest.fn()
jest.mock('@vercel/blob', () => ({
  put: (...a: unknown[]) => mockPut(...a),
}))

const mockUpsert = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune: { upsert: (...a: unknown[]) => mockUpsert(...a) },
  },
}))

import { NextRequest } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/profil/photo/route')

const SESSION = { cjsUid: 'uid-1' }

function jpegFile(name = 'photo.jpg', sizeBytes = 1024): File {
  // SOI JPEG (0xFF 0xD8 0xFF) + padding.
  const header = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
  const body   = new Uint8Array(Math.max(0, sizeBytes - header.length))
  return new File([header, body], name, { type: 'image/jpeg' })
}

function buildReq(formData: FormData | null): NextRequest {
  if (formData === null) {
    return new NextRequest('http://localhost/api/profil/photo', {
      method: 'POST', body: 'nope', headers: { 'content-type': 'text/plain' },
    })
  }
  return new NextRequest('http://localhost/api/profil/photo', { method: 'POST', body: formData })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(SESSION)
  mockPut.mockResolvedValue({ url: 'https://blob.vercel.app/profil-photo/uid-1/photo-x.jpg' })
  mockUpsert.mockResolvedValue({})
})

describe('POST /api/profil/photo', () => {
  it('401 sans session', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    const fd = new FormData()
    fd.append('file', jpegFile())
    const res = await route.POST(buildReq(fd))
    expect(res.status).toBe(401)
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('400 MIME non autorisé', async () => {
    const fd = new FormData()
    fd.append('file', new File(['x'], 'p.gif', { type: 'image/gif' }))
    const res = await route.POST(buildReq(fd))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('INVALID_MIME')
  })

  it('400 magic-bytes invalides (fichier renommé .jpg)', async () => {
    const bogus = new File([new Uint8Array([0x00, 0x00, 0x00, 0x00])], 'fake.jpg', { type: 'image/jpeg' })
    const fd = new FormData()
    fd.append('file', bogus)
    const res = await route.POST(buildReq(fd))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('INVALID_FILE_CONTENT')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('happy path JPEG — 200 + photoUrl + persistance', async () => {
    const fd = new FormData()
    fd.append('file', jpegFile('avatar.jpg', 2048))
    const res = await route.POST(buildReq(fd))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.photoUrl).toBe('https://blob.vercel.app/profil-photo/uid-1/photo-x.jpg')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cjsUid: 'uid-1' },
        update: { photoUrl: 'https://blob.vercel.app/profil-photo/uid-1/photo-x.jpg' },
      }),
    )
    const [pathname] = mockPut.mock.calls[0]
    expect(pathname).toContain('profil-photo/uid-1/')
  })
})
