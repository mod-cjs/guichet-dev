/**
 * @jest-environment node
 *
 * GUIC-218 — Helper `hashId` (logs sans PII).
 */
import { hashId } from '@/lib/logger'

describe('hashId', () => {
  it('retourne un hash hex de 8 caractères', () => {
    const h = hashId('uid-abc-123')
    expect(h).toMatch(/^[0-9a-f]{8}$/)
  })

  it('est déterministe pour un même input', () => {
    expect(hashId('uid-abc-123')).toBe(hashId('uid-abc-123'))
  })

  it('produit des hash différents pour des inputs différents', () => {
    expect(hashId('uid-a')).not.toBe(hashId('uid-b'))
  })
})
