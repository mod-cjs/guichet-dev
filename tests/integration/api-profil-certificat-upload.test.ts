/**
 * @jest-environment node
 *
 * Tests `POST /api/profil/certificats/[id]/upload` (GUIC-360).
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

const mockFindFirst = jest.fn()
const mockUpdate    = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    certificatMoodle: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      update:    (...a: unknown[]) => mockUpdate(...a),
    },
  },
}))

import { NextRequest } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/profil/certificats/[id]/upload/route')

const SESSION = { cjsUid: 'uid-1' }
const PARAMS  = { params: Promise.resolve({ id: 'cert-1' }) }

function pngFile(name = 'cert.png', sizeBytes = 1024): File {
  const header = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const body   = new Uint8Array(Math.max(0, sizeBytes - header.length))
  return new File([header, body], name, { type: 'image/png' })
}

function buildReq(formData: FormData): NextRequest {
  return new NextRequest('http://localhost/api/profil/certificats/cert-1/upload', {
    method: 'POST', body: formData,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(SESSION)
  mockPut.mockResolvedValue({ url: 'https://blob.vercel.app/certif-scan/uid-1/cert-1/cert.png' })
  mockFindFirst.mockResolvedValue({ id: 'cert-1' })
  mockUpdate.mockResolvedValue({})
})

describe('POST /api/profil/certificats/[id]/upload', () => {
  it('401 sans session', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    const fd = new FormData(); fd.append('file', pngFile())
    const res = await route.POST(buildReq(fd), PARAMS)
    expect(res.status).toBe(401)
  })

  it('404 si certificat ne lui appartient pas', async () => {
    mockFindFirst.mockResolvedValueOnce(null)
    const fd = new FormData(); fd.append('file', pngFile())
    const res = await route.POST(buildReq(fd), PARAMS)
    expect(res.status).toBe(404)
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('happy path PNG — 200 + persistance fichierUrl', async () => {
    const fd = new FormData(); fd.append('file', pngFile('moodle-cert.png', 2048))
    const res = await route.POST(buildReq(fd), PARAMS)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.certificatId).toBe('cert-1')
    expect(json.data.fichierUrl).toContain('certif-scan/uid-1/cert-1/')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cert-1' },
        data:  expect.objectContaining({ fichierUrl: expect.stringContaining('certif-scan/uid-1/cert-1/') }),
      }),
    )
  })
})
