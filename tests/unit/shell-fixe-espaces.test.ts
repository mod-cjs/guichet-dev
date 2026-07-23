/**
 * @jest-environment node
 *
 * GUIC-659 — Shell fixe (admin / conseiller / recruteur).
 *
 * Invariant : sur desktop (md+), le shell est verrouillé à la hauteur du viewport
 * et SEUL `<main>` scrolle ; le sidebar est borné (`h-screen`) pour scroller en
 * interne. Avant ce correctif, les 3 espaces étaient en `flex min-h-screen` avec
 * des `<aside>` en `min-h-screen` → c'est le document entier qui scrollait.
 *
 * Sentinelle de contrat (lecture de source, comme pas-de-secret-en-dur.test.ts) :
 * elle échoue si une future modification retire les classes du shell fixe.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const R = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

const LAYOUTS = [
  'src/app/admin/layout.tsx',
  'src/app/conseiller/layout.tsx',
  'src/app/recruteur/layout.tsx',
]

const SIDEBARS = [
  'src/components/layout/AdminSidebar/index.tsx',
  'src/components/layout/ConseillerSidebar/index.tsx',
  'src/components/layout/RecruteurSidebar/index.tsx',
]

describe.each(LAYOUTS)('layout %s — shell fixe desktop', (path) => {
  const src = R(path)

  it('verrouille le shell au viewport (md:h-screen + md:overflow-hidden)', () => {
    expect(src).toMatch(/md:h-screen/)
    expect(src).toMatch(/md:overflow-hidden/)
  })

  it('ne fait scroller que <main> (md:overflow-y-auto + md:min-h-0)', () => {
    const main = src.slice(src.indexOf('<main'))
    expect(main).toMatch(/md:overflow-y-auto/)
    expect(main).toMatch(/md:min-h-0/)
  })
})

describe.each(SIDEBARS)('sidebar %s — hauteur bornée', (path) => {
  const src = R(path)

  it('utilise h-screen (borné) et non min-h-screen (qui grandit)', () => {
    expect(src).toMatch(/\bh-screen\b/)
    expect(src).not.toMatch(/\bmin-h-screen\b/)
  })

  it('garde un overflow-y auto pour le scroll interne de la nav', () => {
    expect(src).toMatch(/overflowY:\s*'auto'|overflow-y-auto/)
  })
})
