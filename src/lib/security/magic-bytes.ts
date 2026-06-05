/**
 * Magic-bytes (file signatures) — GUIC-241.
 *
 * Vérifie qu'un fichier déclaré PDF commence réellement par `%PDF-` (0x25 50 44 46 2D).
 * Un MIME type `application/pdf` annoncé côté client n'est jamais une preuve : un
 * fichier texte renommé `cv.pdf` passerait sinon le filtre MIME et serait servi
 * tel quel par une signed URL recruteur → vecteur XSS futur.
 *
 * Référence : ISO 32000-1:2008 §7.5.2 — "File Header".
 */

/** Signature PDF (5 octets) : `%PDF-`. */
export const HEADER_PDF = [0x25, 0x50, 0x44, 0x46, 0x2d] as const

/**
 * Vérifie que `buf` commence par la signature PDF.
 *
 * Retourne `true` si OK, `false` si signature absente ou buffer trop court.
 * `assertPdfMagicBytes` est le pendant qui throw `InvalidPdfMagicBytesError`.
 */
export function isPdfMagicBytes(buf: Uint8Array): boolean {
  if (buf.length < HEADER_PDF.length) return false
  return HEADER_PDF.every((b, i) => buf[i] === b)
}

export class InvalidPdfMagicBytesError extends Error {
  readonly code = 'INVALID_FILE_CONTENT'
  readonly actualHeaderHex: string
  constructor(buf: Uint8Array) {
    const hex = Array.from(buf.slice(0, HEADER_PDF.length))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ')
    super(`PDF magic-bytes mismatch — actual header: ${hex}`)
    this.actualHeaderHex = hex
  }
}

export function assertPdfMagicBytes(buf: Uint8Array): void {
  if (!isPdfMagicBytes(buf)) {
    throw new InvalidPdfMagicBytesError(buf)
  }
}
