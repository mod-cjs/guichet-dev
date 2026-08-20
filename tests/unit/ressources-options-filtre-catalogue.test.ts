/**
 * @jest-environment node
 *
 * GUIC-689 — Les options de filtre viennent du CATALOGUE, pas de la page vue.
 *
 * `categoriesOptions` était dérivé de `accumulated` — les ressources déjà
 * chargées. Conséquences : la liste des catégories proposées CHANGE à mesure
 * qu'on clique « charger plus », et reste incomplète tant qu'on n'a pas tout
 * parcouru. Un filtre dont les choix dépendent de ce qu'on a déjà vu ne remplit
 * pas son office : il sert précisément à atteindre ce qu'on n'a PAS vu.
 *
 * La correction remonte le calcul côté serveur, sur l'ensemble des ressources
 * publiques.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const lire = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8')

describe('GUIC-689 — options de filtre issues du catalogue', () => {
  it('le loader expose les catégories du catalogue entier', () => {
    const loader = lire('src/lib/loaders/ressources.ts')
    expect(loader).toMatch(/export async function listCategoriesRessources/)
    // `distinct` ou `groupBy` : une lecture d'ensemble, pas d'une page.
    expect(loader).toMatch(/distinct|groupBy/)
  })

  it('le client ne les recalcule plus depuis les éléments chargés', () => {
    const client = lire('src/components/ressources/RessourcesClient.tsx')
    // Le symptôme précis : dériver les options de `accumulated`.
    expect(client).not.toMatch(/categoriesOptions[\s\S]{0,200}accumulated/)
  })

  it('la page les transmet au client', () => {
    const page = lire('src/app/(public)/ressources/page.tsx')
    expect(page).toMatch(/categoriesOptions=/)
  })
})
