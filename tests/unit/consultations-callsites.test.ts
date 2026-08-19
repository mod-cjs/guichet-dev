/**
 * @jest-environment node
 *
 * GUIC-688 — Sentinelle des points d'instrumentation.
 *
 * Rendre chacune de ces pages dans un test coûterait cher (Prisma, SSO, SEO,
 * composants clients) pour vérifier une seule ligne. On garde donc la garantie
 * là où elle est fragile : un `trackVuePage` supprimé par mégarde, ou une page
 * détail ajoutée sans instrumentation, ne se verrait ni au type-check ni au
 * lint — mais se verra ici.
 *
 * Même esprit que `env-documente.test.ts` (variables d'env) et
 * `prisma-migration-bruit-mariadb.test.ts` (bruit de migration).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const RACINE = join(__dirname, '..', '..')

/** Les cinq entités consultables par un bénéficiaire, et leur page détail. */
const PAGES: Array<{ fichier: string; typeEntite: string }> = [
  { fichier: 'src/app/(public)/opportunites/[slug]/page.tsx',           typeEntite: 'opportunite' },
  { fichier: 'src/app/(public)/opportunites/@modal/(.)[slug]/page.tsx', typeEntite: 'opportunite' },
  { fichier: 'src/app/(public)/ressources/[id]/page.tsx',               typeEntite: 'ressource'   },
  { fichier: 'src/app/(public)/agenda/[id]/page.tsx',                   typeEntite: 'evenement'   },
  { fichier: 'src/app/(public)/centres/[slug]/page.tsx',                typeEntite: 'centre'      },
  { fichier: 'src/app/jeune/(app)/bibliotheque/[id]/page.tsx',          typeEntite: 'livre'       },
]

function source(fichier: string): string {
  return readFileSync(join(RACINE, fichier), 'utf-8')
}

describe('GUIC-688 — instrumentation des pages détail', () => {
  it.each(PAGES)('$fichier trace une consultation « $typeEntite »', ({ fichier, typeEntite }) => {
    const src = source(fichier)
    expect(src).toContain('trackVuePage')
    expect(src).toContain(`typeEntite: '${typeEntite}'`)
  })

  // Un `void trackVuePage(...)` peut être abandonné par le runtime serverless
  // quand la réponse part avant que la promesse ne se résolve : l'écriture est
  // alors perdue sans erreur. `after()` existe exactement pour ça.
  it.each(PAGES)('$fichier diffère le tracking avec after() et non un void', ({ fichier }) => {
    const src = source(fichier)
    expect(src).toContain('after(() => trackVuePage(')
    expect(src).not.toContain('void trackVuePage(')
    expect(src).toMatch(/import \{ after \} from 'next\/server'/)
  })

  // Sans lecture de `src`/`from`, un clic venu du chat IA ou de WhatsApp serait
  // enregistré comme du trafic web direct.
  it.each(PAGES)('$fichier transmet les marqueurs de provenance', ({ fichier }) => {
    const src = source(fichier)
    expect(src).toContain('src:')
    expect(src).toContain('from:')
  })
})

/**
 * GUIC-689 — La sentinelle ci-dessus exigeait `after()`, ce qui était juste,
 * mais ne disait rien de CE QU'ON LUI PASSE. Les six pages lui passaient une
 * closure qui lisait `headers()` une fois la réponse partie : Next refusait
 * l'accès aux données de requête, le `catch` avalait l'erreur, et aucune
 * consultation n'était écrite — en dev comme en production.
 *
 * La requête doit être lue AVANT `after()`. `differerVuePage` impose cet
 * ordre par sa signature : il rend une fonction, et pour l'obtenir il faut
 * l'attendre pendant que la requête existe encore.
 */
describe('GUIC-689 — la requête est lue avant after(), pas dedans', () => {
  it.each(PAGES)('$fichier n\'appelle pas trackVuePage dans le callback', ({ fichier }) => {
    const src = source(fichier)
    expect(src).not.toMatch(/after\(\s*\(\s*\)\s*=>\s*trackVuePage/)
    expect(src).not.toMatch(/after\(\s*async\s*\(\s*\)\s*=>\s*\{?[^)]*trackVuePage/)
  })

  it.each(PAGES)('$fichier diffère via differerVuePage', ({ fichier }) => {
    expect(source(fichier)).toMatch(/after\(\s*await\s+differerVuePage\(/)
  })
})
