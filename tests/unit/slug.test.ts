/**
 * Tests unitaires — génération de slugs SEO pour les opportunités (GUIC-20).
 */

import { slugify, generateUniqueSlug, MAX_SLUG_LENGTH } from '@/lib/slug'

describe('slugify', () => {
  it('met en minuscules et remplace les espaces par des tirets', () => {
    expect(slugify('Stage en agriculture')).toBe('stage-en-agriculture')
  })

  it('retire les accents (contexte sénégalais)', () => {
    expect(slugify("Bourse d'études à Dakar")).toBe('bourse-d-etudes-a-dakar')
    expect(slugify('Forêt, Pêche & Élevage')).toBe('foret-peche-elevage')
  })

  it('réduit les séparateurs multiples à un seul tiret', () => {
    expect(slugify('Emploi   ---  numérique')).toBe('emploi-numerique')
  })

  it('supprime les tirets en début et fin', () => {
    expect(slugify('  !Volontariat!  ')).toBe('volontariat')
  })

  it('retombe sur une valeur par défaut si le titre ne produit aucun caractère', () => {
    expect(slugify('???')).toBe('opportunite')
    expect(slugify('')).toBe('opportunite')
  })

  it('tronque sans laisser de tiret final', () => {
    const long = 'mot '.repeat(200).trim()
    const out = slugify(long)
    expect(out.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH)
    expect(out.endsWith('-')).toBe(false)
  })

  it('est idempotent sur une entrée déjà sluggifiée', () => {
    const once = slugify('Appel à projets 2026')
    expect(slugify(once)).toBe(once)
  })
})

describe('generateUniqueSlug', () => {
  it('renvoie le slug de base quand il est libre', async () => {
    const slug = await generateUniqueSlug('Stage en agriculture', () => false)
    expect(slug).toBe('stage-en-agriculture')
  })

  it('ajoute un suffixe court quand le slug de base est pris', async () => {
    const taken = new Set(['stage-en-agriculture'])
    const slug = await generateUniqueSlug('Stage en agriculture', (s) => taken.has(s))
    expect(slug).not.toBe('stage-en-agriculture')
    expect(slug).toMatch(/^stage-en-agriculture-[0-9a-f]{6}$/)
  })

  it('réessaie tant que le suffixe entre en collision', async () => {
    let calls = 0
    const slug = await generateUniqueSlug('Bourse', () => {
      calls += 1
      return calls <= 2 // base + 1er suffixe pris, 2e libre
    })
    expect(calls).toBe(3)
    expect(slug).toMatch(/^bourse-[0-9a-f]{6}$/)
  })

  it('garde le slug suffixé sous la longueur maximale de colonne', async () => {
    const long = 'a'.repeat(400)
    const slug = await generateUniqueSlug(long, (s) => s === slugify(long))
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH)
    expect(slug).toMatch(/-[0-9a-f]{6}$/)
  })
})
