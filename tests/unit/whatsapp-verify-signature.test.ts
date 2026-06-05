/**
 * @jest-environment node
 *
 * GUIC-240 — Sécurité HMAC webhook WhatsApp.
 * Vérifie que `verifyWebhookSignature` :
 *  1. utilise `WHATSAPP_APP_SECRET` (et JAMAIS `WHATSAPP_TOKEN`)
 *  2. accepte une signature `sha256=<hex>` valide
 *  3. rejette une signature altérée (timingSafeEqual)
 *  4. rejette une signature absente / vide
 *  5. rejette si `WHATSAPP_APP_SECRET` n'est pas configuré (fail-closed)
 */

import { createHmac } from 'node:crypto'

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  hashId: jest.fn((s: string) => 'hash-' + String(s).slice(0, 4)),
}))

const APP_SECRET = 'app-secret-meta-12345'
const PAYLOAD    = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id: 'wamid.X' }] } }] }] })

function sign(body: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

describe('verifyWebhookSignature (WhatsApp HMAC)', () => {
  const originalAppSecret = process.env.WHATSAPP_APP_SECRET
  const originalToken     = process.env.WHATSAPP_TOKEN

  beforeEach(() => {
    process.env.WHATSAPP_APP_SECRET = APP_SECRET
    // S'assurer qu'on n'utilise PAS le bearer token comme secret HMAC (régression GUIC-240).
    process.env.WHATSAPP_TOKEN      = 'bearer-token-distinct'
    jest.resetModules()
  })

  afterAll(() => {
    process.env.WHATSAPP_APP_SECRET = originalAppSecret
    process.env.WHATSAPP_TOKEN      = originalToken
  })

  it('accepte une signature sha256=<hex> valide signée avec APP_SECRET', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { verifyWebhookSignature } = require('@/lib/whatsapp')
    const sig = sign(PAYLOAD, APP_SECRET)
    expect(verifyWebhookSignature(PAYLOAD, sig)).toBe(true)
  })

  it('rejette une signature signée avec le bearer token (et non APP_SECRET)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { verifyWebhookSignature } = require('@/lib/whatsapp')
    const wrongSig = sign(PAYLOAD, 'bearer-token-distinct')
    expect(verifyWebhookSignature(PAYLOAD, wrongSig)).toBe(false)
  })

  it('rejette une signature altérée (1 bit flip)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { verifyWebhookSignature } = require('@/lib/whatsapp')
    const sig    = sign(PAYLOAD, APP_SECRET)
    // Flip dernier hex
    const flipped = sig.slice(0, -1) + (sig.slice(-1) === '0' ? '1' : '0')
    expect(verifyWebhookSignature(PAYLOAD, flipped)).toBe(false)
  })

  it('rejette une signature absente / null / vide', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { verifyWebhookSignature } = require('@/lib/whatsapp')
    expect(verifyWebhookSignature(PAYLOAD, null)).toBe(false)
    expect(verifyWebhookSignature(PAYLOAD, '')).toBe(false)
    expect(verifyWebhookSignature(PAYLOAD, undefined)).toBe(false)
  })

  it('rejette (fail-closed) si WHATSAPP_APP_SECRET est absent', async () => {
    delete process.env.WHATSAPP_APP_SECRET
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { verifyWebhookSignature } = require('@/lib/whatsapp')
    const sig = sign(PAYLOAD, APP_SECRET)
    expect(verifyWebhookSignature(PAYLOAD, sig)).toBe(false)
  })

  it('accepte le format sans préfixe sha256= (compat)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { verifyWebhookSignature } = require('@/lib/whatsapp')
    const hexOnly = createHmac('sha256', APP_SECRET).update(PAYLOAD).digest('hex')
    expect(verifyWebhookSignature(PAYLOAD, hexOnly)).toBe(true)
  })
})
