/**
 * @jest-environment node
 *
 * GUIC-140 — routes de liaison WhatsApp :
 *  - GET /api/whatsapp/link          (entrée du lien magique)
 *  - GET /api/whatsapp/link/confirm  (retour post-SSO → binding)
 */
import { NextRequest } from 'next/server'

const mockConsume = jest.fn()
const mockBind = jest.fn()
jest.mock('@/lib/whatsapp/magic-link', () => ({
  consumeLinkToken: (...a: unknown[]) => mockConsume(...a),
  bindWhatsAppNumber: (...a: unknown[]) => mockBind(...a),
  linkConfirmationMessage: () => 'Compte lié ✅',
  LINK_TTL_S: 600,
}))

const mockSend = jest.fn()
jest.mock('@/lib/whatsapp', () => ({ sendTextMessage: (...a: unknown[]) => mockSend(...a) }))

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { GET as linkGET } from '@/app/api/whatsapp/link/route'
import { GET as confirmGET } from '@/app/api/whatsapp/link/confirm/route'

const BASE = 'https://guichet.sn'

beforeEach(() => {
  jest.clearAllMocks()
  mockSend.mockResolvedValue(undefined)
  mockBind.mockResolvedValue(undefined)
})

describe('GET /api/whatsapp/link', () => {
  it('token invalide → redirige vers une page d’erreur, sans binding', async () => {
    mockConsume.mockResolvedValue(null)
    const res = await linkGET(new NextRequest(`${BASE}/api/whatsapp/link?token=bad`))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/connexion')
    expect(mockBind).not.toHaveBeenCalled()
  })

  it('token valide + session existante → binding immédiat + confirmation WhatsApp', async () => {
    mockConsume.mockResolvedValue('+221770000000')
    mockGetSession.mockResolvedValue({ cjsUid: 'u-1' })
    const res = await linkGET(new NextRequest(`${BASE}/api/whatsapp/link?token=ok`))
    expect(mockBind).toHaveBeenCalledWith('+221770000000', 'u-1')
    expect(mockSend).toHaveBeenCalledWith('+221770000000', 'Compte lié ✅')
    expect(res.headers.get('location')).toContain('/jeune')
  })

  it('token valide sans session → cookie téléphone + returnTo, redirige vers le login SSO', async () => {
    mockConsume.mockResolvedValue('+221770000000')
    mockGetSession.mockResolvedValue(null)
    const res = await linkGET(new NextRequest(`${BASE}/api/whatsapp/link?token=ok`))
    expect(mockBind).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toContain('/api/auth/login')
    const phoneCookie = res.cookies.get('wa_link_phone')
    expect(phoneCookie?.value).toBe('+221770000000')
    expect(phoneCookie?.httpOnly).toBe(true)
    expect(res.cookies.get('auth_return_to')?.value).toBe('/api/whatsapp/link/confirm')
  })
})

describe('GET /api/whatsapp/link/confirm', () => {
  it('session + cookie téléphone → binding + confirmation + efface le cookie', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u-9' })
    const req = new NextRequest(`${BASE}/api/whatsapp/link/confirm`, {
      headers: { cookie: 'wa_link_phone=+221770000000' },
    })
    const res = await confirmGET(req)
    expect(mockBind).toHaveBeenCalledWith('+221770000000', 'u-9')
    expect(mockSend).toHaveBeenCalledWith('+221770000000', 'Compte lié ✅')
    expect(res.headers.get('location')).toContain('/jeune')
    // cookie effacé (maxAge 0 / expires passé)
    expect(res.cookies.get('wa_link_phone')?.value).toBe('')
  })

  it('sans session → redirige vers connexion, aucun binding', async () => {
    mockGetSession.mockResolvedValue(null)
    const req = new NextRequest(`${BASE}/api/whatsapp/link/confirm`, {
      headers: { cookie: 'wa_link_phone=+221770000000' },
    })
    const res = await confirmGET(req)
    expect(mockBind).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toContain('/auth/connexion')
  })

  it('session mais cookie téléphone absent → redirige vers connexion, aucun binding', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u-9' })
    const req = new NextRequest(`${BASE}/api/whatsapp/link/confirm`)
    const res = await confirmGET(req)
    expect(mockBind).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toContain('/auth/connexion')
  })
})
