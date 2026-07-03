/**
 * @jest-environment node
 */
// GUIC-493 / GUIC-501 — Socle Espace conseiller : helpers purs du contexte
// (initiales + choix du centre actif parmi les rattachements AgentCentre).
import { buildInitials, pickActiveCentre, type ConseillerCentre } from './conseiller'

describe('buildInitials (GUIC-493)', () => {
  it('compose les initiales prénom + nom', () => {
    expect(buildInitials('Cheikh', 'Ndiaye')).toBe('CN')
  })

  it('retombe sur les premières lettres disponibles si un champ manque', () => {
    expect(buildInitials('Awa', null)).toBe('A')
    expect(buildInitials('', 'Diop')).toBe('D')
    expect(buildInitials(null, undefined)).toBe('')
  })

  it('met en majuscules', () => {
    expect(buildInitials('modou', 'sarr')).toBe('MS')
  })
})

describe('pickActiveCentre (GUIC-493 — multi-centre)', () => {
  const centres: ConseillerCentre[] = [
    { id: 'c1', nom: 'CJS Tambacounda' },
    { id: 'c2', nom: 'CJS Bakel' },
  ]

  it('retourne null si aucun rattachement', () => {
    expect(pickActiveCentre([], 'c1')).toBeNull()
  })

  it('privilégie le centre préféré quand il existe', () => {
    expect(pickActiveCentre(centres, 'c2')?.id).toBe('c2')
  })

  it('retombe sur le premier centre si le préféré est inconnu ou absent', () => {
    expect(pickActiveCentre(centres, 'zzz')?.id).toBe('c1')
    expect(pickActiveCentre(centres, null)?.id).toBe('c1')
    expect(pickActiveCentre(centres)?.id).toBe('c1')
  })
})
