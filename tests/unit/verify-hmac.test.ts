import { createHmac, createHash } from 'crypto'

const API_KEY    = 'test-api-key'
const API_SECRET = 'test-api-secret-super-long'

// Définir les env vars AVANT le premier import du module (buildSecrets() est évalué à l'import)
process.env.BRM_API_KEY    = API_KEY
process.env.BRM_API_SECRET = API_SECRET

// Import après la définition des env vars
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { verifyHmacSignature } = require('@/lib/verify-hmac')

function sign(apiKey: string, timestamp: string, body: string, secret = API_SECRET): string {
  const bodyHash = createHash('sha256').update(body).digest('hex')
  const message  = `${apiKey}\n${timestamp}\n${bodyHash}`
  return createHmac('sha256', secret).update(message).digest('hex')
}

function now(): string {
  return String(Math.floor(Date.now() / 1000))
}

describe('verifyHmacSignature', () => {
  it('accepte une signature valide', () => {
    const ts   = now()
    const body = JSON.stringify({ event: 'user.updated' })
    const sig  = sign(API_KEY, ts, body)
    expect(verifyHmacSignature(API_KEY, ts, sig, body)).toBe(true)
  })

  it('rejette une signature incorrecte', () => {
    const ts   = now()
    const body = JSON.stringify({ event: 'user.updated' })
    expect(verifyHmacSignature(API_KEY, ts, 'deadbeef'.repeat(8), body)).toBe(false)
  })

  it('rejette un timestamp trop ancien (> 5 min)', () => {
    const ts   = String(Math.floor(Date.now() / 1000) - 400)
    const body = '{}'
    const sig  = sign(API_KEY, ts, body)
    expect(verifyHmacSignature(API_KEY, ts, sig, body)).toBe(false)
  })

  it('rejette un timestamp dans le futur (> 5 min)', () => {
    const ts   = String(Math.floor(Date.now() / 1000) + 400)
    const body = '{}'
    const sig  = sign(API_KEY, ts, body)
    expect(verifyHmacSignature(API_KEY, ts, sig, body)).toBe(false)
  })

  it('rejette une clé API inconnue', () => {
    const ts   = now()
    const body = '{}'
    const sig  = sign('unknown-key', ts, body)
    expect(verifyHmacSignature('unknown-key', ts, sig, body)).toBe(false)
  })

  it('rejette si apiKey absent', () => {
    expect(verifyHmacSignature('', now(), 'sig', '{}')).toBe(false)
  })

  it('rejette si timestamp absent', () => {
    expect(verifyHmacSignature(API_KEY, '', 'sig', '{}')).toBe(false)
  })

  it('rejette si signature absente', () => {
    expect(verifyHmacSignature(API_KEY, now(), '', '{}')).toBe(false)
  })

  it('rejette si le body est altéré après signature', () => {
    const ts      = now()
    const body    = JSON.stringify({ amount: 100 })
    const sig     = sign(API_KEY, ts, body)
    const tampered = JSON.stringify({ amount: 999 })
    expect(verifyHmacSignature(API_KEY, ts, sig, tampered)).toBe(false)
  })

  // --- GUIC-242 — sécurité stricte (pas de padding, hex strict) ---

  describe('GUIC-242 — durcissement HMAC', () => {
    it('rejette une signature non-hex (Buffer.from drop silencieux)', () => {
      const ts = now()
      // 64 caractères mais contient des non-hex (z) — sans HEX_RE, Buffer.from drop silencieusement
      const fake = 'z'.repeat(64)
      expect(verifyHmacSignature(API_KEY, ts, fake, '{}')).toBe(false)
    })

    it('rejette une signature trop courte (aucun padding ajouté)', () => {
      const ts = now()
      // Avant le fix : padEnd(expected.length, "0") étendait la signature jusqu'à 64 chars
      expect(verifyHmacSignature(API_KEY, ts, 'ab', '{}')).toBe(false)
    })

    it('rejette une signature trop courte d un seul caractère hex', () => {
      const ts   = now()
      const body = JSON.stringify({ event: 'x' })
      const sig  = sign(API_KEY, ts, body)
      expect(verifyHmacSignature(API_KEY, ts, sig.slice(0, -1), body)).toBe(false)
    })

    it('rejette une signature trop longue', () => {
      const ts   = now()
      const body = JSON.stringify({ event: 'x' })
      const sig  = sign(API_KEY, ts, body)
      expect(verifyHmacSignature(API_KEY, ts, sig + 'ab', body)).toBe(false)
    })

    it('rejette une signature mêlant hex et non-hex à la bonne longueur', () => {
      const ts = now()
      // 63 hex + 1 non-hex (g)
      const mixed = 'a'.repeat(63) + 'g'
      expect(verifyHmacSignature(API_KEY, ts, mixed, '{}')).toBe(false)
    })

    it('rejette une signature de bonne longueur mais valeur fausse', () => {
      const ts = now()
      expect(verifyHmacSignature(API_KEY, ts, '0'.repeat(64), '{}')).toBe(false)
    })

    it('rejette un timestamp non numérique', () => {
      const body = '{}'
      const sig  = sign(API_KEY, 'NaN', body)
      expect(verifyHmacSignature(API_KEY, 'NaN', sig, body)).toBe(false)
    })

    it('accepte une signature valide (regression — fix ne casse pas le chemin nominal)', () => {
      const ts   = now()
      const body = JSON.stringify({ event: 'machine.sync' })
      const sig  = sign(API_KEY, ts, body)
      expect(verifyHmacSignature(API_KEY, ts, sig, body)).toBe(true)
    })
  })
})
