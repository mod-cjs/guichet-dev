/**
 * Tests GUIC-689 — design v5 (CTA conversion + code couleur catégories).
 *
 * `tailwind.config.ts` doit exposer les tokens `--gj-action*` et `--cat-*`
 * (livrés par la fondation dans `src/styles/tokens.css`, GUIC-689) comme
 * classes Tailwind (`bg-gj-action`, `bg-cat-stage-soft`, `text-cat-stage-ink`…).
 * Sans cette exposition, les composants qui les consomment n'ont aucun effet
 * visuel (classe inconnue = ignorée par Tailwind).
 */
import fs from 'fs'
import path from 'path'

const source = fs.readFileSync(path.join(process.cwd(), 'tailwind.config.ts'), 'utf-8')

describe('tailwind.config.ts — tokens gj-action (design v5)', () => {
  it.each(['gj-action', 'gj-action-deep', 'gj-action-soft', 'gj-action-ink'])(
    'expose la couleur %s',
    (key) => {
      expect(source).toMatch(new RegExp(`'${key}':`))
    },
  )
})

describe('tailwind.config.ts — familles cat-* (code couleur catégories)', () => {
  const families = [
    'cat-emploi',
    'cat-stage',
    'cat-formation',
    'cat-financement',
    'cat-evenement',
    'cat-volontariat',
    'cat-neutre',
  ]

  it.each(families)('expose la couleur de base %s', (key) => {
    expect(source).toMatch(new RegExp(`'${key}':`))
  })

  it.each(families)('expose la variante douce %s-soft', (key) => {
    expect(source).toMatch(new RegExp(`'${key}-soft':`))
  })

  it.each(families)('expose la variante encre %s-ink', (key) => {
    expect(source).toMatch(new RegExp(`'${key}-ink':`))
  })
})
