/**
 * @jest-environment node
 *
 * GUIC-264 — Anti-régression : la page /ressources doit wrapper son client
 * dans un Suspense boundary (useSearchParams/useRouter/usePathname).
 *
 * Test SSR : on rend la page et on s'assure que `<Suspense>` est présent
 * dans le code source (vérif statique du fichier — pas de render full SSR
 * avec Prisma mocké car la chaîne est lourde).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('GUIC-264 — /ressources Suspense wrapping', () => {
  const PAGE_PATH = resolve(__dirname, '../../src/app/(public)/ressources/page.tsx')

  it('importe Suspense depuis react', () => {
    const src = readFileSync(PAGE_PATH, 'utf-8')
    expect(src).toMatch(/import\s+\{\s*Suspense\s*\}\s+from\s+['"]react['"]/)
  })

  it('rend RessourcesClient à l\'intérieur d\'un <Suspense>', () => {
    const src = readFileSync(PAGE_PATH, 'utf-8')
    // Chercher la séquence ouverture Suspense ... RessourcesClient ... fermeture Suspense
    const suspenseBlockRe = /<Suspense[^>]*>[\s\S]*?<RessourcesClient[\s\S]*?<\/Suspense>/
    expect(src).toMatch(suspenseBlockRe)
  })

  it('le composant client utilise useSearchParams (justification du Suspense)', () => {
    const clientPath = resolve(__dirname, '../../src/components/ressources/RessourcesClient.tsx')
    const src = readFileSync(clientPath, 'utf-8')
    expect(src).toMatch(/useSearchParams\b/)
  })
})
