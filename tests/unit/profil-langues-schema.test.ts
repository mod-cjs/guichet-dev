/**
 * @jest-environment node
 *
 * GUIC-689 — Validation des langues déclarées (carte « Compétences & langues »).
 *
 * Le modèle `LangueProfil` impose déjà l'unicité `(profil, langue)` en base ;
 * le schéma doit refuser en amont ce que la base refuserait, pour rendre une
 * erreur lisible plutôt qu'une violation de contrainte.
 */
import { LangueSchema, MAX_LANGUES, NIVEAUX_LANGUE } from '@/lib/profil-schemas'

const ok = (d: unknown) => LangueSchema.safeParse(d).success

describe('GUIC-689 — schéma des langues', () => {
  it('accepte une langue et un niveau connus', () => {
    expect(ok({ langue: 'Wolof', niveau: 'maternelle' })).toBe(true)
  })

  it('refuse un niveau inventé — la carte le traduirait en libellé introuvable', () => {
    expect(ok({ langue: 'Wolof', niveau: 'bilingue' })).toBe(false)
  })

  it('refuse une langue vide ou faite d’espaces', () => {
    expect(ok({ langue: '', niveau: 'courant' })).toBe(false)
    expect(ok({ langue: '   ', niveau: 'courant' })).toBe(false)
  })

  it('refuse un nom de langue démesuré', () => {
    expect(ok({ langue: 'x'.repeat(61), niveau: 'courant' })).toBe(false)
  })

  it('expose les quatre niveaux, dans l’ordre du plus fort au plus faible', () => {
    expect(NIVEAUX_LANGUE).toEqual(['maternelle', 'courant', 'intermediaire', 'notions'])
  })

  it('borne le nombre de langues par profil', () => {
    expect(MAX_LANGUES).toBeGreaterThan(3)
    expect(MAX_LANGUES).toBeLessThanOrEqual(15)
  })
})
