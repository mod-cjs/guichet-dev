/**
 * GUIC-522 — un emprunt est « en retard » par DÉRIVATION (le statut `en_retard` n'est jamais
 * écrit en base) : `en_cours` + date de retour prévue passée. Source unique de vérité, pour
 * que l'admin, le conseiller et les rappels ne divergent pas (compteurs qui interrogeaient
 * `statut='en_retard'` renvoyaient toujours 0).
 */
import { estEnRetard, whereEnRetard } from '@/lib/bibliotheque/retard'

const NOW = new Date('2026-08-18T12:00:00Z')
const hier = new Date('2026-08-17T12:00:00Z')
const demain = new Date('2026-08-19T12:00:00Z')

describe('GUIC-522 — estEnRetard (dérivation)', () => {
  it('en_cours + date de retour passée → en retard', () => {
    expect(estEnRetard({ statut: 'en_cours', dateRetourPrevue: hier }, NOW)).toBe(true)
  })
  it('en_cours + date future → pas en retard', () => {
    expect(estEnRetard({ statut: 'en_cours', dateRetourPrevue: demain }, NOW)).toBe(false)
  })
  it('en_cours sans date prévue → pas en retard (on ne suppose pas)', () => {
    expect(estEnRetard({ statut: 'en_cours', dateRetourPrevue: null }, NOW)).toBe(false)
  })
  it('statut en_retard stocké (legacy) → en retard', () => {
    expect(estEnRetard({ statut: 'en_retard', dateRetourPrevue: null }, NOW)).toBe(true)
  })
  it('rendu / initié → jamais en retard', () => {
    expect(estEnRetard({ statut: 'rendu', dateRetourPrevue: hier }, NOW)).toBe(false)
    expect(estEnRetard({ statut: 'initie', dateRetourPrevue: hier }, NOW)).toBe(false)
  })
  it('accepte une date ISO string (DTO)', () => {
    expect(estEnRetard({ statut: 'en_cours', dateRetourPrevue: hier.toISOString() }, NOW)).toBe(true)
  })

  it('whereEnRetard : condition Prisma = en_retard OU (en_cours & échu)', () => {
    const w = whereEnRetard(NOW)
    expect(w.OR).toEqual([
      { statut: 'en_retard' },
      { statut: 'en_cours', dateRetourPrevue: { lt: NOW } },
    ])
  })
})
