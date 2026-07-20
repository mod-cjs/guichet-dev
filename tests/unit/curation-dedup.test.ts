/**
 * GUIC-599 — US-4 : déduplication déterministe (empreinte contenu + similarité titre).
 */
import {
  normaliser,
  empreinteContenu,
  tokensTitre,
  similariteJaccard,
  SEUIL_SIMILARITE,
} from '@/lib/curation/dedup/empreinte'

describe('GUIC-599 — normalisation', () => {
  it('minuscule, sans accents, espaces réduits', () => {
    expect(normaliser('  Développeur   Backend  ')).toBe('developpeur backend')
    expect(normaliser('Chargé de PROJET')).toBe('charge de projet')
  })
})

describe('GUIC-599 — empreinte contenu', () => {
  it('même titre+org (à l’accent/casse près) → même empreinte', () => {
    const a = empreinteContenu('Développeur Backend', 'CJS Tech')
    const b = empreinteContenu('developpeur backend', 'cjs tech')
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it('titre différent → empreinte différente', () => {
    expect(empreinteContenu('Dev Backend', 'CJS')).not.toBe(empreinteContenu('Dev Frontend', 'CJS'))
  })

  it('null si pas de titre', () => {
    expect(empreinteContenu(null, 'CJS')).toBeNull()
    expect(empreinteContenu('', 'CJS')).toBeNull()
  })

  it('la deadline discrimine (C-1) : même titre+org, deadlines ≠ → empreintes ≠', () => {
    const a = empreinteContenu('Chargé de projet', 'ONG', '2026-08-31')
    const b = empreinteContenu('Chargé de projet', 'ONG', '2026-11-30')
    expect(a).not.toBe(b)
    // Sans deadline des deux côtés → même empreinte (annonce identique).
    expect(empreinteContenu('X', 'ONG')).toBe(empreinteContenu('X', 'ONG'))
  })
})

describe('GUIC-599 — similarité titre (quasi-doublons)', () => {
  it('tokens : minuscules, sans accents, mots courts écartés', () => {
    expect([...tokensTitre('Stage de Marketing Digital')].sort()).toEqual([
      'digital',
      'marketing',
      'stage',
    ])
  })

  it('Jaccard = intersection / union', () => {
    const a = tokensTitre('Stage marketing digital 2026')
    const b = tokensTitre('Stage marketing digital')
    expect(similariteJaccard(a, b)).toBeCloseTo(0.75, 2) // {stage,marketing,digital,2026} ∩ {…}=3 / ∪=4
  })

  it('un quasi-doublon dépasse le seuil, un titre distinct non', () => {
    const ref = tokensTitre('Stage marketing digital 2026')
    expect(similariteJaccard(ref, tokensTitre('Stage marketing digital'))).toBeGreaterThanOrEqual(
      SEUIL_SIMILARITE,
    )
    expect(similariteJaccard(ref, tokensTitre('Bourse doctorale physique'))).toBeLessThan(
      SEUIL_SIMILARITE,
    )
  })

  it('discrimine à la borne : 2 tokens communs sur 3+1 = 0.5 < seuil (pas un doublon)', () => {
    // {stage,marketing,digital} ∩ {stage,marketing,vente} = 2 / ∪=4 → 0.5.
    const sim = similariteJaccard(
      tokensTitre('Stage marketing digital'),
      tokensTitre('Stage marketing vente'),
    )
    expect(sim).toBeCloseTo(0.5, 2)
    expect(sim).toBeLessThan(SEUIL_SIMILARITE) // ne doit PAS être fusionné (faux positif évité)
  })
})
