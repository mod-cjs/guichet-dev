/**
 * @jest-environment node
 *
 * GUIC-241 — Tests `assertPdfMagicBytes` / `isPdfMagicBytes`.
 *
 * Note : la route `POST /api/upload/cv` utilise `handleUpload` du SDK
 * `@vercel/blob/client` qui contourne notre code pour téléverser directement
 * vers Vercel Blob. La validation magic-bytes a donc lieu dans
 * `onUploadCompleted` (cf. `src/app/api/upload/cv/route.ts`) sur le fichier
 * déjà stocké. Les tests ici couvrent le helper pur — la logique de fetch +
 * `del()` est testable seulement en e2e contre Vercel Blob.
 */

import {
  isPdfMagicBytes,
  assertPdfMagicBytes,
  InvalidPdfMagicBytesError,
  HEADER_PDF,
} from '@/lib/security/magic-bytes'

describe('magic-bytes PDF — GUIC-241', () => {
  it('accepte un PDF valide (header %PDF- + version)', () => {
    // %PDF-1.4 → 25 50 44 46 2D 31 2E 34
    const buf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
    expect(isPdfMagicBytes(buf)).toBe(true)
    expect(() => assertPdfMagicBytes(buf)).not.toThrow()
  })

  it('rejette un fake PDF (texte ASCII avec mime application/pdf)', () => {
    // "Hello, w" — texte arbitraire renommé .pdf côté client
    const buf = new TextEncoder().encode('Hello, world').slice(0, 8)
    expect(isPdfMagicBytes(buf)).toBe(false)
    expect(() => assertPdfMagicBytes(buf)).toThrow(InvalidPdfMagicBytesError)
  })

  it('rejette un buffer trop court (< 5 octets)', () => {
    const buf = new Uint8Array([0x25, 0x50, 0x44]) // "%PD" seulement
    expect(isPdfMagicBytes(buf)).toBe(false)
    expect(() => assertPdfMagicBytes(buf)).toThrow(InvalidPdfMagicBytesError)
  })

  it('rejette un PNG renommé .pdf (signature 89 50 4E 47)', () => {
    const buf = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(isPdfMagicBytes(buf)).toBe(false)
  })

  it('InvalidPdfMagicBytesError expose l\'en-tête réel en hex (debug)', () => {
    const buf = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d])
    try {
      assertPdfMagicBytes(buf)
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidPdfMagicBytesError)
      expect((err as InvalidPdfMagicBytesError).code).toBe('INVALID_FILE_CONTENT')
      expect((err as InvalidPdfMagicBytesError).actualHeaderHex).toBe('89 50 4e 47 0d')
    }
  })

  it('HEADER_PDF == %PDF-', () => {
    expect(String.fromCharCode(...HEADER_PDF)).toBe('%PDF-')
  })
})
