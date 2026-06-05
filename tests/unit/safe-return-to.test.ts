/**
 * @jest-environment node
 *
 * GUIC-241 — Tests unitaires `safeReturnTo` (whitelist regex stricte).
 * Couvre les vecteurs open-redirect classiques.
 */

import { safeReturnTo } from '@/lib/security/safe-return-to'

describe('safeReturnTo — GUIC-241', () => {
  describe('paths sûrs → retour tel quel', () => {
    it.each([
      ['/jeune/tableau-de-bord'],
      ['/jeune/opportunites?page=2'],
      ['/auth/connexion?error=no_role'],
      ['/jeune/opportunites?email=user%40example.com'],
      ['/jeune/profil#section-2'],
      ['/jeune/opportunites?filter=stage&region=dakar'],
    ])('accepte %s', (path) => {
      expect(safeReturnTo(path)).toBe(path)
    })
  })

  describe('vecteurs open-redirect → null', () => {
    it.each([
      ['//evil.com',              'protocol-relative'],
      ['//evil.com/path',         'protocol-relative + path'],
      ['/\\evil.com',             'backslash-trick'],
      ['/\\\\evil.com',           'double backslash'],
      ['javascript:alert(1)',     'javascript: pseudo-protocol'],
      ['http://evil.com',         'absolute http'],
      ['https://evil.com',        'absolute https'],
      ['data:text/html,foo',      'data URI'],
      ['ftp://evil.com',          'absolute ftp'],
      ['foo/bar',                 'path relatif sans / initial'],
      ['',                        'string vide'],
    ])('rejette %s (%s)', (path) => {
      expect(safeReturnTo(path)).toBeNull()
    })

    it('rejette undefined', () => {
      expect(safeReturnTo(undefined)).toBeNull()
    })

    it('rejette null', () => {
      expect(safeReturnTo(null)).toBeNull()
    })

    it('rejette caractères de contrôle (CRLF injection)', () => {
      expect(safeReturnTo('/foo\r\nSet-Cookie: x=1')).toBeNull()
    })

    it('rejette espace (unicode whitespace evasion)', () => {
      expect(safeReturnTo('/foo bar')).toBeNull()
    })
  })
})
