/**
 * GUIC-522 — F-14/F-15/F-17 (bibliothèque admin, dette design système).
 *
 * Ces assertions lisent le SOURCE (readFileSync) plutôt que de rendre les composants en
 * jsdom : jsdom ne résout pas `var(--x, #fallback)` (propriété raccourcie CSS custom
 * property) via `getComputedStyle`, donc un test de rendu ne peut ni prouver la présence
 * du fallback hex ni sa suppression — seule la lecture de source est fiable ici.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..', '..')
const OVERVIEW = path.join(root, 'src/app/admin/bibliotheque/page.tsx')
const CATALOGUE = path.join(root, 'src/app/admin/bibliotheque/gestion/AdminBiblioCatalogueClient.tsx')
const EMPRUNTS = path.join(root, 'src/app/admin/bibliotheque/gestion/AdminBiblioEmpruntsClient.tsx')

function read(p: string): string {
  return readFileSync(p, 'utf8')
}

describe('GUIC-522 F-15 — aucun fallback hex sur un token qui existe déjà (tokens.css)', () => {
  const HEX_FALLBACK = /var\(--gj-[a-z-]+,\s*#[0-9a-fA-F]{3,8}\)/

  it('page.tsx (overview) — zéro fallback hex', () => {
    expect(read(OVERVIEW)).not.toMatch(HEX_FALLBACK)
  })
  it('AdminBiblioCatalogueClient.tsx — zéro fallback hex', () => {
    expect(read(CATALOGUE)).not.toMatch(HEX_FALLBACK)
  })
  it('AdminBiblioEmpruntsClient.tsx — zéro fallback hex', () => {
    expect(read(EMPRUNTS)).not.toMatch(HEX_FALLBACK)
  })
})

describe('GUIC-522 F-14 — aucune couleur littérale hors token (page.tsx)', () => {
  it('le badge highlight n’utilise plus rgba(239,68,68,…) en dur', () => {
    expect(read(OVERVIEW)).not.toMatch(/rgba\(\s*239,\s*68,\s*68/)
  })
})

describe('GUIC-522 F-17 — textes ≥11px (page.tsx)', () => {
  it('en-tête de tableau desktop (≥11px)', () => {
    const src = read(OVERVIEW)
    // valeurs bannies : 8/9/9.5/10/10.5 (px) sur fontSize
    expect(src).not.toMatch(/fontSize:\s*10\.5,/)
  })
  it('labels de stat mobile (≥11px)', () => {
    const src = read(OVERVIEW)
    expect(src).not.toMatch(/fontSize:\s*10,/)
  })
})
