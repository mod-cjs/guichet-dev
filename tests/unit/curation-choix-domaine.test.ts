/**
 * @jest-environment node
 *
 * GUIC-689 — Le domaine se CHOISIT à la publication (décision tech lead,
 * 2026-08-17, en complément de la refonte de taxonomie).
 *
 * Avant : l'écran de curation présentait un `<Input>` texte libre, et
 * `domaineOuAutre()` n'acceptait la valeur que si elle correspondait
 * EXACTEMENT à un nom d'enum. Tout le reste — « informatique », « Numérique »
 * accentué, une phrase entière — retombait silencieusement sur `Autre`.
 *
 * D'où les onze offres non classées du catalogue : personne n'avait choisi,
 * un défaut technique avait décidé.
 *
 * Désormais : une proposition est calculée par mots-clés, l'admin la confirme
 * ou la corrige, et rien ne part sans décision humaine.
 */
import { domaineProposePourCuration } from '@/lib/domaines'

describe('GUIC-689 — proposition de domaine à la publication', () => {
  it.each([
    ['informatique et développement web', 'Economie'],
    ['Numérique', 'Economie'],
    ['agriculture et élevage', 'Economie'],
    ['santé communautaire', 'BienEtre'],
    ['protection de l’environnement', 'Ecologie'],
    ['formation professionnelle', 'Employabilite'],
    ['engagement citoyen', 'Citoyennete'],
    ['patrimoine et musique', 'Culture'],
  ])('« %s » → %s', (texte, attendu) => {
    expect(domaineProposePourCuration(texte)).toBe(attendu)
  })

  it('accepte déjà une valeur d’enum telle quelle', () => {
    expect(domaineProposePourCuration('Employabilite')).toBe('Employabilite')
  })

  it('ne propose RIEN quand le texte n’évoque aucune catégorie', () => {
    // Chaîne vide, pas `Autre` : `Autre` est un repli technique, pas un choix.
    // Laisser vide force l'admin à trancher au lieu de valider un classement
    // qu'il n'a pas fait.
    expect(domaineProposePourCuration('xyzzy')).toBe('')
    expect(domaineProposePourCuration('')).toBe('')
    expect(domaineProposePourCuration(undefined)).toBe('')
  })

  it('ne propose jamais le repli technique', () => {
    const propositions = ['informatique', 'santé', 'xyzzy', ''].map(domaineProposePourCuration)
    expect(propositions).not.toContain('Autre')
  })
})

describe('GUIC-689 — l’écran de curation offre un choix, plus un champ libre', () => {
  const { readFileSync } = jest.requireActual('node:fs') as typeof import('node:fs')
  const { resolve } = jest.requireActual('node:path') as typeof import('node:path')
  const src = readFileSync(
    resolve(process.cwd(), 'src/app/admin/curation/[id]/CurationDetail.tsx'),
    'utf-8',
  )

  it('plus aucun champ texte libre pour le domaine', () => {
    expect(src).not.toMatch(/<Input[^>]*id="c-domaine"/)
  })

  it('un sélecteur adossé au vocabulaire officiel', () => {
    expect(src).toMatch(/<Select[^>]*id="c-domaine"/)
    expect(src).toMatch(/DOMAINES_VISIBLES/)
  })

  it('la proposition automatique alimente la valeur initiale', () => {
    // Assertion portée sur la PAGE, qui calcule la valeur, et non sur le
    // composant : l'y chercher se satisfaisait d'un import inutilisé — un test
    // vert grâce à du code mort ne prouve rien.
    const page = readFileSync(
      resolve(process.cwd(), 'src/app/admin/curation/[id]/page.tsx'),
      'utf-8',
    )
    expect(page).toMatch(/domaine:\s*domaineProposePourCuration\(/)
  })
})
