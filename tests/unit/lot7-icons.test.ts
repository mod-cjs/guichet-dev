/**
 * @jest-environment node
 *
 * GUIC-351 — Anti-régression sprite icons Lot 7.
 *
 * Garantit que les 5 icons utilisés par les composants Lot 7 sont :
 *   1. déclarés dans `ICON_NAMES` (TypeScript)
 *   2. présents physiquement dans `public/icons.svg` (avec préfixe `i-`)
 *
 * Icons concernés : block, car, desktop, share, target.
 * (`share` et `target` préexistants — testés en garde-fou anti-régression.)
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ICON_NAMES } from '@/components/ui/Icon'

const LOT7_ICONS = ['block', 'car', 'desktop', 'share', 'target'] as const

describe('GUIC-351 — sprite icons Lot 7', () => {
  const sprite = readFileSync(
    resolve(__dirname, '../../public/icons.svg'),
    'utf-8',
  )

  describe('Déclaration TypeScript (ICON_NAMES)', () => {
    it.each(LOT7_ICONS)('%s figure dans ICON_NAMES', name => {
      expect(ICON_NAMES).toContain(name)
    })
  })

  describe('Présence dans le sprite SVG', () => {
    it.each(LOT7_ICONS)('symbol id="i-%s" présent dans public/icons.svg', name => {
      expect(sprite).toMatch(new RegExp(`id="i-${name}"`))
    })
  })

  it('chaque icon Lot 7 a un viewBox 24×24 (cohérence visuelle)', () => {
    for (const name of LOT7_ICONS) {
      const symbolRe = new RegExp(`<symbol id="i-${name}"[^>]*viewBox="0 0 24 24"`)
      expect(sprite).toMatch(symbolRe)
    }
  })
})
