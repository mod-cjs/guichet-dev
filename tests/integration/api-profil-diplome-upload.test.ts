/**
 * @jest-environment node
 *
 * Tests `POST /api/profil/diplomes/[id]/upload` (GUIC-360).
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
    diplome: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      update:    (...a: unknown[]) => mockUpdate(...a),
    },
  },
}))

import { NextRequest } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/profil/diplomes/[id]/upload/route')

const SESSION = { cjsUid: 'uid-1' }
const PARAMS  = { params: Promise.resolve({ id: 'dip-1' }) }

function pdfFile(name = 'scan.pdf', sizeBytes = 2048): File {
  const header = new TextEncoder().encode('%PDF-1.7')
  const body   = new Uint8Array(Math.max(0, sizeBytes - header.length))
  return new File([header, body], name, { type: 'application/pdf' })
}

function buildReq(formData: FormData): NextRequest {
  return new NextRequest('http://localhost/api/profil/diplomes/dip-1/upload', {
    method: 'POST', body: formData,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(SESSION)
  mockPut.mockResolvedValue({ url: 'https://blob.vercel.app/diplome-scan/uid-1/dip-1/scan.pdf' })
  mockFindFirst.mockResolvedValue({ id: 'dip-1' })
  mockUpdate.mockResolvedValue({})
})

describe('POST /api/profil/diplomes/[id]/upload', () => {
  it('401 sans session', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    const fd = new FormData(); fd.append('file', pdfFile())
    const res = await route.POST(buildReq(fd), PARAMS)
    expect(res.status).toBe(401)
  })

  it('404 si diplôme ne lui appartient pas', async () => {
    mockFindFirst.mockResolvedValueOnce(null)
    const fd = new FormData(); fd.append('file', pdfFile())
    const res = await route.POST(buildReq(fd), PARAMS)
    expect(res.status).toBe(404)
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('400 si magic-bytes PDF invalides', async () => {
    const bogus = new File([new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0])], 'fake.pdf', { type: 'application/pdf' })
    const fd = new FormData(); fd.append('file', bogus)
    const res = await route.POST(buildReq(fd), PARAMS)
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('INVALID_FILE_CONTENT')
  })

  it('happy path PDF — 200 + persistance fichierUrl', async () => {
    const fd = new FormData(); fd.append('file', pdfFile('diplome.pdf', 4096))
    const res = await route.POST(buildReq(fd), PARAMS)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.diplomeId).toBe('dip-1')
    expect(json.data.fichierUrl).toContain('diplome-scan/uid-1/dip-1/')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dip-1' },
        data:  expect.objectContaining({ fichierUrl: expect.stringContaining('diplome-scan/uid-1/dip-1/') }),
      }),
    )
  })
})
