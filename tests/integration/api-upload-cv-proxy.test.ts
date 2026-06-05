/**
 * @jest-environment node
 *
 * Tests d'intégration de `POST /api/upload/cv` (GUIC-225).
 *
 * Stratégie : route proxy serveur (option B audit GUIC-189). On mocke
 * `@vercel/blob.put()` pour ne pas dépendre du SaaS dans CI, et on couvre
 * les 7 branches métier (auth, FormData, MIME, taille, happy path,
 * sanitization, échec amont).
 */

import { NextRequest } from 'next/server'
import { MAX_CV_BYTES } from '@/lib/constants/candidature'

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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/upload/cv/route')

const SESSION = { cjsUid: 'uid-1', prenom: 'Awa', nom: 'Diop' }

function buildReq(formData: FormData | null): NextRequest {
  if (formData === null) {
    return new NextRequest('http://localhost/api/upload/cv', {
      method: 'POST',
      body: 'pas du formdata',
      headers: { 'content-type': 'text/plain' },
    })
  }
  return new NextRequest('http://localhost/api/upload/cv', {
    method: 'POST',
    body: formData,
  })
}

function pdfFile(name: string, sizeBytes = 1024): File {
  // En-tête %PDF- requis par la validation magic-bytes (GUIC-241).
  const header = new TextEncoder().encode('%PDF-1.7')
  const body = new Uint8Array(Math.max(0, sizeBytes - header.length))
  return new File([header, body], name, { type: 'application/pdf' })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(SESSION)
  mockPut.mockResolvedValue({ url: 'https://blob.vercel.app/cv/uid-1/cv-xyz.pdf' })
})

describe('POST /api/upload/cv', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    const fd = new FormData()
    fd.append('file', pdfFile('cv.pdf'))
    const res = await route.POST(buildReq(fd))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('renvoie 400 si le body n’est pas un FormData', async () => {
    const res = await route.POST(buildReq(null))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('renvoie 400 si le MIME n’est pas autorisé', async () => {
    const fd = new FormData()
    fd.append(
      'file',
      new File(['x'], 'cv.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    )
    const res = await route.POST(buildReq(fd))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('INVALID_MIME')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('renvoie 400 si la taille dépasse la limite', async () => {
    const fd = new FormData()
    fd.append('file', pdfFile('big.pdf', MAX_CV_BYTES + 1))
    const res = await route.POST(buildReq(fd))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('FILE_TOO_LARGE')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('happy path PDF — 200 + meta {url,name,sizeKb}', async () => {
    const fd = new FormData()
    fd.append('file', pdfFile('cv.pdf', 2048))
    const res = await route.POST(buildReq(fd))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual({
      url: 'https://blob.vercel.app/cv/uid-1/cv-xyz.pdf',
      name: 'cv.pdf',
      sizeKb: 2,
    })
    expect(mockPut).toHaveBeenCalledTimes(1)
    const [pathname, , options] = mockPut.mock.calls[0]
    expect(pathname).toBe('cv/uid-1/cv.pdf')
    expect(options).toMatchObject({
      access: 'public',
      addRandomSuffix: true,
      contentType: 'application/pdf',
    })
  })

  it('sanitize le nom de fichier (espaces et caractères spéciaux)', async () => {
    const fd = new FormData()
    fd.append('file', pdfFile('bad name (1).pdf', 100))
    const res = await route.POST(buildReq(fd))
    expect(res.status).toBe(200)
    const [pathname] = mockPut.mock.calls[0]
    expect(pathname).toBe('cv/uid-1/bad_name__1_.pdf')
    const json = await res.json()
    expect(json.data.name).toBe('bad_name__1_.pdf')
  })

  it('renvoie 502 si `put()` échoue', async () => {
    mockPut.mockRejectedValueOnce(new Error('blob store down'))
    const fd = new FormData()
    fd.append('file', pdfFile('cv.pdf'))
    const res = await route.POST(buildReq(fd))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error.code).toBe('UPLOAD_FAILED')
    expect(json.error.message).toContain('blob store down')
  })
})
