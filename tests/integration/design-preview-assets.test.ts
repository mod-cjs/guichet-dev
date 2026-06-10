/**
 * @jest-environment node
 *
 * GUIC-351 — Anti-régression : tous les CSS et JSX référencés par les Lot HTML
 * du design preview doivent exister dans `public/design-v2/` (servis statiquement
 * par Vercel).
 *
 * Bug initial 2026-06-09 : les Lots référençaient `tokens.css`,
 * `colors_and_type.css`, et 21 fichiers `.jsx` qui n'existaient pas dans
 * `public/design-v2/` (seulement dans `design-guichet-v2/`). Résultat : 404
 * sur tous les assets → page blanche malgré CSP correct (GUIC-258).
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')
const PUBLIC_DIR = resolve(ROOT, 'public/design-v2')
const SOURCE_DIR = resolve(ROOT, 'design-guichet-v2')

function listLotHtmls(): string[] {
  return readdirSync(PUBLIC_DIR).filter((f) => /^Lot \d - .+\.html$/.test(f))
}

function extractRefs(htmlPath: string): string[] {
  const html = readFileSync(htmlPath, 'utf-8')
  const refs: string[] = []
  // <link rel="stylesheet" href="X">
  for (const m of html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/g)) {
    refs.push(m[1])
  }
  // <script src="X">
  for (const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)) {
    refs.push(m[1])
  }
  // Filtrer les URLs absolues externes (unpkg, etc.)
  return refs.filter((r) => !r.startsWith('http://') && !r.startsWith('https://') && !r.startsWith('//'))
}

describe('GUIC-351 — public/design-v2 contient tous les assets référencés', () => {
  const lotHtmls = listLotHtmls()

  it('au moins 7 lots HTML sont présents dans public/design-v2', () => {
    expect(lotHtmls.length).toBeGreaterThanOrEqual(7)
  })

  it.each(lotHtmls)('%s : tous les CSS et JSX référencés existent', (lot) => {
    const refs = extractRefs(resolve(PUBLIC_DIR, lot))
    const missing: string[] = []
    for (const ref of refs) {
      const path = resolve(PUBLIC_DIR, ref)
      if (!existsSync(path)) missing.push(ref)
    }
    if (missing.length > 0) {
      throw new Error(
        `Lot "${lot}" référence ${missing.length} fichier(s) manquant(s) dans public/design-v2/ :\n${missing.map((m) => `  - ${m}`).join('\n')}`,
      )
    }
  })

  it('tokens.css existe (référencé par tous les lots)', () => {
    expect(existsSync(resolve(PUBLIC_DIR, 'tokens.css'))).toBe(true)
  })

  it('colors_and_type.css existe', () => {
    expect(existsSync(resolve(PUBLIC_DIR, 'colors_and_type.css'))).toBe(true)
  })

  it('au moins 20 fichiers .jsx présents dans public/design-v2', () => {
    const jsxFiles = readdirSync(PUBLIC_DIR).filter((f) => f.endsWith('.jsx'))
    expect(jsxFiles.length).toBeGreaterThanOrEqual(20)
  })

  it('source design-guichet-v2 et public/design-v2 contiennent les mêmes .jsx', () => {
    const sourceJsx = readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.jsx')).sort()
    const publicJsx = readdirSync(PUBLIC_DIR).filter((f) => f.endsWith('.jsx')).sort()
    expect(publicJsx).toEqual(sourceJsx)
  })
})
