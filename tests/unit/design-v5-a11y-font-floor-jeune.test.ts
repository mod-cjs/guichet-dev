/**
 * GUIC-689 (vague 2, espace jeune) — hygiène accessibilité :
 * - plancher typographique 11px non négociable (design-guichet-v5/CLAUDE.md,
 *   `--fs-100: 11px` dans tokens.css) sur BenefSidebar/BenefTopBar
 * - hex en dur → tokens `gj-*` sur BenefSidebar / MyCardCjs
 * - retrait des fallbacks hex `var(--token, #hex)` devenus inutiles une fois
 *   le token confirmé présent dans tokens.css (bibliothèque, messagerie,
 *   YayeSkeletonCards)
 *
 * Sentinelle de contrat (lecture de source, pas de rendu) : jsdom/cssstyle
 * ne sérialise pas fidèlement les styles inline utilisant var(), donc on
 * vérifie le texte source plutôt que le DOM calculé pour les assertions de
 * token/hex.
 */
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

describe('Sentinelle — plancher typographique 11px (GUIC-689, espace jeune)', () => {
  const FONT_FLOOR_FILES = [
    'src/components/layout/BenefSidebar/index.tsx',
    'src/components/layout/BenefTopBar/index.tsx',
  ]

  it.each(FONT_FLOOR_FILES)(
    '%s : aucun fontSize numérique inline < 11 (--fs-100)',
    (relPath) => {
      const content = read(relPath)
      const tooSmall = [...content.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)/g)]
        .map((m) => parseFloat(m[1]))
        .filter((v) => v < 11)
      expect(tooSmall).toEqual([])
    },
  )
})

describe('BenefSidebar — hex en dur → tokens (GUIC-689)', () => {
  const src = () => read('src/components/layout/BenefSidebar/index.tsx')

  it('la carte "Inclusion & accessibilité" ne contient plus #FFFFFF en dur', () => {
    const content = src()
    const idx = content.indexOf('Inclusion & accessibilité')
    const block = content.slice(idx, idx + 700)
    expect(block).not.toMatch(/#FFFFFF/i)
    expect(block).toMatch(/var\(--gj-surface\)/)
  })
})

describe('MyCardCjs — hex en dur → tokens (GUIC-689)', () => {
  const src = () => read('src/components/profil/MyCardCjs.tsx')

  it('le fond blanc du pseudo-QR (style + fill) utilise var(--gj-surface), plus de #fff', () => {
    const content = src()
    expect(content).not.toMatch(/#fff\b/i)
    expect(content).toMatch(/var\(--gj-surface\)/)
  })

  it('conserve #0A2A24 (cellules QR) avec un commentaire d\'exception explicite', () => {
    const content = src()
    expect(content).toMatch(/#0A2A24/)
    const idx = content.indexOf('#0A2A24')
    const before = content.slice(Math.max(0, idx - 300), idx)
    expect(before).toMatch(/exception|contraste/i)
  })
})

describe('Sentinelle — retrait des fallbacks hex sur tokens existants (GUIC-689)', () => {
  const FALLBACK_FILES = [
    'src/app/jeune/(app)/bibliotheque/mes-emprunts/page.tsx',
    'src/app/jeune/(app)/bibliotheque/[id]/page.tsx',
    'src/app/jeune/(app)/bibliotheque/[id]/emprunt-button.tsx',
    'src/app/jeune/(app)/messagerie/page.tsx',
    'src/app/jeune/(app)/messagerie/[id]/page.tsx',
  ]

  it.each(FALLBACK_FILES)('%s : plus de fallback hex var(--gj-xxx, #hex)', (relPath) => {
    const content = read(relPath)
    expect(content).not.toMatch(/var\(--gj-[a-z0-9-]+,\s*#[0-9a-fA-F]{3,8}\)/i)
  })
})

describe('YayeSkeletonCards — fallback gj-surface retiré, gj-bg-soft conservé (token absent)', () => {
  const content = () => read('src/components/ui/Yaye/YayeSkeletonCards/index.tsx')

  it('var(--gj-surface) sans fallback hex', () => {
    expect(content()).not.toMatch(/var\(--gj-surface,\s*#[0-9a-fA-F]{3,8}\)/)
    expect(content()).toMatch(/var\(--gj-surface\)/)
  })

  it('var(--gj-bg-soft, #eef1f0) conserve son fallback (token absent de tokens.css — signalé, pas inventé ici)', () => {
    expect(content()).toMatch(/var\(--gj-bg-soft,\s*#eef1f0\)/)
  })
})
