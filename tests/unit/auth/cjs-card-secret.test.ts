/**
 * @jest-environment node
 *
 * GUIC-389 — `getCJSCardSecret()` : secret unique pour émetteur + vérifieur
 * du JWT QR MyCJSCard.
 *
 * - prod sans env → throw (fail-fast)
 * - dev sans env → warn + fallback déterministe
 * - encode UTF-8
 * - retourne le secret env quand défini
 */

describe('getCJSCardSecret', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...ORIGINAL_ENV }
    delete process.env.JWT_CJS_CARD_SECRET
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('throw en production si JWT_CJS_CARD_SECRET absent', async () => {
    process.env.NODE_ENV = 'production'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCJSCardSecret } = require('@/lib/auth/cjs-card-secret')
    expect(() => getCJSCardSecret()).toThrow(/JWT_CJS_CARD_SECRET/i)
  })

  it('en dev sans env : warn console + renvoie un fallback déterministe', async () => {
    process.env.NODE_ENV = 'development'
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCJSCardSecret } = require('@/lib/auth/cjs-card-secret')
    const a = getCJSCardSecret()
    const b = getCJSCardSecret()
    expect(a).toBeInstanceOf(Uint8Array)
    expect(a.length).toBeGreaterThanOrEqual(32)
    // déterministe : deux appels successifs donnent le MÊME secret
    expect(Buffer.from(a).toString('hex')).toBe(Buffer.from(b).toString('hex'))
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('encode la valeur env en UTF-8 (Uint8Array)', async () => {
    process.env.NODE_ENV = 'test'
    process.env.JWT_CJS_CARD_SECRET =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCJSCardSecret } = require('@/lib/auth/cjs-card-secret')
    const s = getCJSCardSecret()
    expect(s).toBeInstanceOf(Uint8Array)
    expect(Buffer.from(s).toString('utf8')).toBe(process.env.JWT_CJS_CARD_SECRET)
  })

  it('retourne le secret env quand défini (même hors prod)', async () => {
    process.env.NODE_ENV = 'development'
    process.env.JWT_CJS_CARD_SECRET = 'super-secret-dev-32-chars-min-1234567890'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCJSCardSecret } = require('@/lib/auth/cjs-card-secret')
    const s = getCJSCardSecret()
    expect(Buffer.from(s).toString('utf8')).toBe('super-secret-dev-32-chars-min-1234567890')
  })
})
