import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Tests structurels — vérifient que la page /centres a été refondue en 2-col
 * desktop sans contraindre le rendu mobile à un container `max-w-screen-sm`.
 *
 * On lit le source directement (snapshot léger) plutôt que de monter la page
 * avec des dépendances Next.js (getSession etc.).
 */
const SRC = resolve(__dirname, '../../src/app/(public)/centres/page.tsx')
const source = readFileSync(SRC, 'utf-8')

describe('/centres page layout', () => {
  it('ne contraint plus le root à max-w-screen-sm (desktop libre)', () => {
    // Le root ne doit pas porter max-w-screen-sm — seul le bloc mobile peut le porter.
    const rootMatch = source.match(/<div className="bg-gj-bg[^"]*"/)
    expect(rootMatch).not.toBeNull()
    expect(rootMatch![0]).not.toMatch(/max-w-screen-sm/)
  })

  it('définit un bloc desktop lg:grid 2 colonnes', () => {
    expect(source).toMatch(/lg:grid-cols-\[1fr_400px\]/)
  })

  it('isole le bloc mobile par lg:hidden et le bloc desktop par hidden lg:grid', () => {
    expect(source).toMatch(/lg:hidden/)
    expect(source).toMatch(/hidden lg:grid/)
  })

  it('utilise variant="desktop" pour CentresMap dans la colonne large', () => {
    expect(source).toMatch(/variant="desktop"/)
  })

  it('rend la colonne droite sticky', () => {
    expect(source).toMatch(/lg:sticky/)
  })
})
