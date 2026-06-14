/**
 * @jest-environment node
 *
 * GUIC-387 — verifyCJSCardToken : valid / invalid signature / expired / malformed.
 */

import { SignJWT } from 'jose'
import {
  CJSCardTokenError,
  verifyCJSCardToken,
} from '@/lib/auth/verifyCJSCardToken'

const SECRET = 'a'.repeat(64)
const OTHER  = 'b'.repeat(64)

beforeAll(() => {
  process.env.JWT_CJS_CARD_SECRET = SECRET
})

async function makeToken(
  payload: { sub: string; nonce: string },
  opts: { exp?: number; secret?: string } = {},
): Promise<string> {
  const secret = new TextEncoder().encode(opts.secret ?? SECRET)
  const now = Math.floor(Date.now() / 1000)
  return await new SignJWT({ nonce: payload.nonce })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(opts.exp ?? now + 900)
    .sign(secret)
}

describe('verifyCJSCardToken', () => {
  it('retourne le payload pour un token valide', async () => {
    const t = await makeToken({ sub: 'user-1', nonce: 'nonce-1' })
    const p = await verifyCJSCardToken(t)
    expect(p).not.toBeNull()
    expect(p?.sub).toBe('user-1')
    expect(p?.nonce).toBe('nonce-1')
    expect(p?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('retourne null pour une signature invalide', async () => {
    const t = await makeToken({ sub: 'user-1', nonce: 'nonce-1' }, { secret: OTHER })
    const p = await verifyCJSCardToken(t)
    expect(p).toBeNull()
  })

  it('throw CJSCardTokenError("expired") si exp dépassé', async () => {
    const past = Math.floor(Date.now() / 1000) - 60
    const t = await makeToken({ sub: 'user-1', nonce: 'nonce-1' }, { exp: past })
    await expect(verifyCJSCardToken(t)).rejects.toBeInstanceOf(CJSCardTokenError)
    await expect(verifyCJSCardToken(t)).rejects.toMatchObject({ reason: 'expired' })
  })

  it('retourne null pour un token malformé', async () => {
    expect(await verifyCJSCardToken('')).toBeNull()
    expect(await verifyCJSCardToken('not-a-jwt')).toBeNull()
    expect(await verifyCJSCardToken('a.b')).toBeNull()
  })
})
