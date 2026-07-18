/**
 * @jest-environment node
 *
 * GUIC-578 (C2) — Nettoyage CDP des logs : chemins et messages ne doivent pas fuiter de PII.
 */
import { scrubPath, scrubMessage } from '@/lib/observability/scrub'

describe('scrubPath', () => {
  it('neutralise un cjs_uid (UUID) dans un chemin', () => {
    expect(scrubPath('/api/admin/utilisateurs/00116efd-3740-4ad2-9512-7d639df65524')).toBe(
      '/api/admin/utilisateurs/:id',
    )
  })
  it('neutralise un identifiant opaque long (hex ≥ 16)', () => {
    expect(scrubPath('/api/candidatures/a1b2c3d4e5f6a7b8/cv')).toBe('/api/candidatures/:id/cv')
  })
  it('laisse un chemin sans identifiant intact', () => {
    expect(scrubPath('/api/opportunites')).toBe('/api/opportunites')
  })
})

describe('scrubMessage', () => {
  it('caviarde un email', () => {
    expect(scrubMessage('constraint failed: jean.dupont@example.com')).not.toContain('example.com')
  })
  it('caviarde un téléphone E.164', () => {
    expect(scrubMessage('numéro +221771234567 déjà utilisé')).not.toContain('221771234567')
  })
  it('laisse un message sans PII intact', () => {
    expect(scrubMessage('timeout Redis après 5s')).toBe('timeout Redis après 5s')
  })
})
