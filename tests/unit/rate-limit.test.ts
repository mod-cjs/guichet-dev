/**
 * @jest-environment node
 *
 * next/server (NextResponse) exige le global Web `Request`, fourni par Node mais pas
 * par jsdom (l'environnement par défaut de la suite).
 */
import type { NextRequest } from 'next/server'

// Mock du client Redis : on pilote la valeur renvoyée par le pipeline multi().exec().
const mockExec = jest.fn()
const mockSet = jest.fn().mockReturnThis()
const mockIncr = jest.fn().mockReturnThis()
jest.mock('@/lib/redis', () => ({
  redis: {
    multi: () => ({ set: mockSet, incr: mockIncr, exec: mockExec }),
  },
}))

import { rateLimit, extractIp } from '@/lib/rate-limit'

// rateLimit/extractIp n'utilisent que request.headers.get() → stub minimal
// (évite le global Web `Request` requis par NextRequest, absent en env node).
function req(headers: Record<string, string> = {}): NextRequest {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return { headers: { get: (k: string) => lower[k.toLowerCase()] ?? null } } as unknown as NextRequest
}

// exec() d'ioredis renvoie [[err, val], …] : ici SET puis INCR.
function execResult(counter: number) {
  return [[null, 'OK'], [null, counter]]
}

beforeEach(() => {
  mockExec.mockReset()
  mockSet.mockClear()
  mockIncr.mockClear()
})

describe('rateLimit', () => {
  it('laisse passer sous la limite (renvoie null)', async () => {
    mockExec.mockResolvedValue(execResult(1))
    const res = await rateLimit(req(), { windowMs: 60_000, max: 20, keyPrefix: 'ia:u1', authenticated: true })
    expect(res).toBeNull()
  })

  it('laisse passer pile à la limite', async () => {
    mockExec.mockResolvedValue(execResult(20))
    const res = await rateLimit(req(), { windowMs: 60_000, max: 20, keyPrefix: 'ia:u1', authenticated: true })
    expect(res).toBeNull()
  })

  it('renvoie 429 au-dessus de la limite (le bug no-op est corrigé)', async () => {
    mockExec.mockResolvedValue(execResult(21))
    const res = await rateLimit(req(), { windowMs: 60_000, max: 20, keyPrefix: 'ia:u1', authenticated: true })
    expect(res).not.toBeNull()
    expect(res!.status).toBe(429)
    expect(res!.headers.get('Retry-After')).toBe('60')
    const body = await res!.json()
    expect(body.error.code).toBe('RATE_LIMITED')
  })

  it('pose la TTL au premier hit uniquement (SET …EX NX)', async () => {
    mockExec.mockResolvedValue(execResult(1))
    await rateLimit(req(), { windowMs: 60_000, max: 20, keyPrefix: 'ia:u1', authenticated: true })
    // SET avec option NX + EX pour une vraie fenêtre fixe.
    expect(mockSet).toHaveBeenCalledWith('rl:ia:u1', '0', 'EX', 60, 'NX')
    expect(mockIncr).toHaveBeenCalledWith('rl:ia:u1')
  })

  it('fail-open si Redis est indisponible (ne casse pas l’endpoint)', async () => {
    mockExec.mockRejectedValue(new Error('ECONNREFUSED'))
    const res = await rateLimit(req(), { windowMs: 60_000, max: 20, keyPrefix: 'ia:u1', authenticated: true })
    expect(res).toBeNull()
  })

  it('fail-open sur réponse Redis inattendue (exec vide)', async () => {
    mockExec.mockResolvedValue(null)
    const res = await rateLimit(req(), { windowMs: 60_000, max: 20, keyPrefix: 'ia:u1', authenticated: true })
    expect(res).toBeNull()
  })

  it('clé authentifiée = sans IP ; clé anonyme = avec IP', async () => {
    mockExec.mockResolvedValue(execResult(1))
    await rateLimit(req(), { windowMs: 60_000, max: 20, keyPrefix: 'ia:u1', authenticated: true })
    expect(mockSet).toHaveBeenLastCalledWith('rl:ia:u1', '0', 'EX', 60, 'NX')

    mockSet.mockClear()
    await rateLimit(req({ 'x-real-ip': '10.0.0.9' }), { windowMs: 60_000, max: 5, keyPrefix: 'pub' })
    expect(mockSet).toHaveBeenLastCalledWith('rl:pub:10.0.0.9', '0', 'EX', 60, 'NX')
  })
})

describe('extractIp', () => {
  it('préfère x-real-ip (injecté par le proxy de confiance)', () => {
    expect(extractIp(req({ 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' }))).toBe('1.2.3.4')
  })
  it('retombe sur la première IP de x-forwarded-for', () => {
    expect(extractIp(req({ 'x-forwarded-for': '5.6.7.8, 9.9.9.9' }))).toBe('5.6.7.8')
  })
  it('renvoie no-ip en l’absence d’en-têtes', () => {
    expect(extractIp(req())).toBe('no-ip')
  })
})
