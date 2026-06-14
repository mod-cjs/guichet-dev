/**
 * @jest-environment node
 *
 * GUIC-389 — vérifieur JWT QR MyCJSCard : check `kid` + `scope`.
 *
 * Empêche qu'un futur JWT signé avec le même secret mais d'un autre scope
 * (ex: kid différent, scope != 'checkin') soit accepté par le scanner.
 */

import { SignJWT } from 'jose'

const SECRET_HEX =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

beforeAll(() => {
  process.env.JWT_CJS_CARD_SECRET = SECRET_HEX
})

async function makeToken(opts: {
  kid?: string
  scope?: string
  sub?: string
  nonce?: string
  expIn?: number
}): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000)
  const exp = nowSec + (opts.expIn ?? 60)
  const builder = new SignJWT({
    ...(opts.scope !== undefined ? { scope: opts.scope } : {}),
    nonce: opts.nonce ?? 'nonce-1',
  })
    .setProtectedHeader({ alg: 'HS256', ...(opts.kid ? { kid: opts.kid } : {}) })
    .setSubject(opts.sub ?? 'sub-1')
    .setIssuedAt(nowSec)
    .setExpirationTime(exp)
  return await builder.sign(new TextEncoder().encode(SECRET_HEX))
}

describe('verifyCJSCardToken — kid + scope', () => {
  it('rejette un token avec un `kid` différent de cjs-checkin-v1', async () => {
    const token = await makeToken({ kid: 'autre-kid', scope: 'checkin' })
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { verifyCJSCardToken } = require('@/lib/auth/verifyCJSCardToken')
    await expect(verifyCJSCardToken(token)).resolves.toBeNull()
  })

  it('rejette un token avec un `scope` différent de checkin', async () => {
    const token = await makeToken({ kid: 'cjs-checkin-v1', scope: 'other' })
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { verifyCJSCardToken } = require('@/lib/auth/verifyCJSCardToken')
    await expect(verifyCJSCardToken(token)).resolves.toBeNull()
  })

  it('accepte un token avec kid=cjs-checkin-v1 ET scope=checkin', async () => {
    const token = await makeToken({ kid: 'cjs-checkin-v1', scope: 'checkin', sub: 'uid-1', nonce: 'n-1' })
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { verifyCJSCardToken } = require('@/lib/auth/verifyCJSCardToken')
    const payload = await verifyCJSCardToken(token)
    expect(payload).not.toBeNull()
    expect(payload!.sub).toBe('uid-1')
    expect(payload!.nonce).toBe('n-1')
  })
})
