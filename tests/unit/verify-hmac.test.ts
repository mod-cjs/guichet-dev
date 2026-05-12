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
})
