/**
 * Tests `hasValidMagicBytes` (GUIC-360) — défense en profondeur pour les
 * uploads profil (photo, scan diplôme, scan certificat).
 */

import { hasValidMagicBytes } from '@/lib/upload/profil-uploads'

describe('hasValidMagicBytes', () => {
  it('valide un en-tête PDF', () => {
    const buf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])
    expect(hasValidMagicBytes('application/pdf', buf)).toBe(true)
  })

  it('valide un en-tête JPEG', () => {
    expect(hasValidMagicBytes('image/jpeg', new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true)
  })

  it('valide un en-tête PNG', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    expect(hasValidMagicBytes('image/png', png)).toBe(true)
  })

  it('valide un en-tête WebP (RIFF + WEBP)', () => {
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46,  // RIFF
      0x00, 0x00, 0x00, 0x00,  // size
      0x57, 0x45, 0x42, 0x50,  // WEBP
    ])
    expect(hasValidMagicBytes('image/webp', webp)).toBe(true)
  })

  it('rejette un fichier renommé .jpg', () => {
    expect(hasValidMagicBytes('image/jpeg', new Uint8Array([0x00, 0x00, 0x00, 0x00]))).toBe(false)
  })

  it('rejette un RIFF non WEBP', () => {
    const wav = new Uint8Array([
      0x52, 0x49, 0x46, 0x46,
      0x00, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45,  // WAVE
    ])
    expect(hasValidMagicBytes('image/webp', wav)).toBe(false)
  })

  it('rejette un MIME inconnu', () => {
    expect(hasValidMagicBytes('image/gif', new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBe(false)
  })
})
