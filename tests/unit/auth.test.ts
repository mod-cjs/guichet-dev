/**
 * @jest-environment node
 *
 * Tests unitaires — src/lib/auth.ts
 * encodeSession, decodeSession (via getSession), setSessionCookie, clearSessionCookie
 */

process.env.SESSION_SECRET = 'test-secret-at-least-32-chars-long!!'

import { NextRequest, NextResponse } from 'next/server'

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  hashId: jest.fn((s: string) => 'hash-' + String(s).slice(0, 4)),
}))

import { encodeSession, getSession, setSessionCookie, clearSessionCookie } from '@/lib/auth'
import type { CJSSession } from '@/types/user'

// ── Fixture ────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<CJSSession> = {}): CJSSession {
  return {
    cjsUid:             'uid-test-123',
    nom:                'Diallo',
    prenom:             'Fatou',
    email:              'fatou@example.sn',
    telephone:          '+221770000000',
    region:             'Dakar',
    roles:              ['beneficiaire'],
    accessToken:        'at-xxx',
    refreshToken:       'rt-xxx',
    expiresAt:          Math.floor(Date.now() / 1000) + 3600,
    onboardingComplete: false,
    ...overrides,
  }
}

// ── encodeSession ──────────────────────────────────────────────────────────

describe('encodeSession', () => {
  it('retourne un JWT HS256 non-vide', async () => {
    const jwt = await encodeSession(makeSession())
    expect(typeof jwt).toBe('string')
    expect(jwt.split('.').length).toBe(3)
  })

  it('roundtrip : encode puis decode retrouve la session', async () => {
    const session = makeSession()
    const jwt     = await encodeSession(session)
    const req     = new NextRequest('http://localhost:3000/jeune')
    req.cookies.set('cjs_session', jwt)
    const decoded = await getSession(req)

    expect(decoded?.cjsUid).toBe(session.cjsUid)
    expect(decoded?.nom).toBe(session.nom)
    expect(decoded?.roles).toEqual(session.roles)
    expect(decoded?.expiresAt).toBe(session.expiresAt)
  })

  it('encode une session avec nom/prenom vides (new account sans last_name)', async () => {
    const session = makeSession({ nom: '', prenom: '' })
    const jwt     = await encodeSession(session)
    const req     = new NextRequest('http://localhost:3000/jeune')
    req.cookies.set('cjs_session', jwt)
    const decoded = await getSession(req)
    expect(decoded?.nom).toBe('')
    expect(decoded?.prenom).toBe('')
  })

  it('encode une session avec email null', async () => {
    const session = makeSession({ email: null })
    const jwt     = await encodeSession(session)
    const req     = new NextRequest('http://localhost:3000/jeune')
    req.cookies.set('cjs_session', jwt)
    const decoded = await getSession(req)
    expect(decoded?.email).toBeNull()
  })

  it('lève une erreur si SESSION_SECRET est absente', async () => {
    const original = process.env.SESSION_SECRET
    const originalNextauth = process.env.NEXTAUTH_SECRET
    delete process.env.SESSION_SECRET
    delete process.env.NEXTAUTH_SECRET
    await expect(encodeSession(makeSession())).rejects.toThrow('SESSION_SECRET manquant')
    process.env.SESSION_SECRET = original
    if (originalNextauth) process.env.NEXTAUTH_SECRET = originalNextauth
  })

  it('utilise NEXTAUTH_SECRET comme fallback si SESSION_SECRET absent', async () => {
    const original = process.env.SESSION_SECRET
    delete process.env.SESSION_SECRET
    process.env.NEXTAUTH_SECRET = 'fallback-secret-at-least-32-chars-ok!!'
    const jwt = await encodeSession(makeSession())
    expect(jwt.split('.').length).toBe(3)
    process.env.SESSION_SECRET  = original
    delete process.env.NEXTAUTH_SECRET
  })
})

// ── getSession ─────────────────────────────────────────────────────────────

describe('getSession', () => {
  it('retourne null si le cookie cjs_session est absent', async () => {
    const req = new NextRequest('http://localhost:3000/jeune')
    expect(await getSession(req)).toBeNull()
  })

  it('retourne null si le cookie est un JWT invalide', async () => {
    const req = new NextRequest('http://localhost:3000/jeune')
    req.cookies.set('cjs_session', 'not.a.jwt')
    expect(await getSession(req)).toBeNull()
  })

  it('retourne null si le JWT est signé avec une autre clé', async () => {
    // Signer avec un secret différent
    process.env.SESSION_SECRET = 'different-secret-at-least-32chars!!!'
    const jwt = await encodeSession(makeSession())
    process.env.SESSION_SECRET = 'test-secret-at-least-32-chars-long!!'

    const req = new NextRequest('http://localhost:3000/jeune')
    req.cookies.set('cjs_session', jwt)
    expect(await getSession(req)).toBeNull()
  })

  it('retourne null si le JWT est expiré', async () => {
    const session = makeSession({ expiresAt: Math.floor(Date.now() / 1000) - 10 })
    const jwt     = await encodeSession(session)
    const req     = new NextRequest('http://localhost:3000/jeune')
    req.cookies.set('cjs_session', jwt)
    expect(await getSession(req)).toBeNull()
  })
})

// ── setSessionCookie ───────────────────────────────────────────────────────

describe('setSessionCookie', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true })
  })

  it('pose le cookie cjs_session avec httpOnly et sameSite=strict (GUIC-218)', () => {
    const response = new NextResponse()
    setSessionCookie(response, 'jwt-value', 3600)
    const cookie = response.cookies.get('cjs_session')
    expect(cookie?.value).toBe('jwt-value')
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('strict')
    expect(cookie?.maxAge).toBe(3600)
  })

  it('secure=false en développement', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
    const response = new NextResponse()
    setSessionCookie(response, 'jwt-value', 3600)
    expect(response.cookies.get('cjs_session')?.secure).toBe(false)
  })

  it('secure=true en production', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })
    const response = new NextResponse()
    setSessionCookie(response, 'jwt-value', 3600)
    expect(response.cookies.get('cjs_session')?.secure).toBe(true)
  })
})

// ── clearSessionCookie ─────────────────────────────────────────────────────

describe('clearSessionCookie', () => {
  it('supprime le cookie cjs_session', () => {
    const response = new NextResponse()
    response.cookies.set('cjs_session', 'some-jwt')
    clearSessionCookie(response)
    // cookies.delete positionne Max-Age=0
    expect(response.cookies.get('cjs_session')?.value).toBeFalsy()
  })
})
