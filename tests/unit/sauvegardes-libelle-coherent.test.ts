/**
 * @jest-environment node
 *
 * GUIC-689 (É-21) — Le menu et la page doivent porter le MÊME nom.
 *
 * La sidebar a été renommée « Mes sauvegardes » (libellé v5) ; la page d'arrivée
 * est restée « Mes favoris », y compris dans le titre d'onglet et dans le lien
 * de retour de la sous-page ressources.
 *
 * On clique donc sur une entrée de menu et on atterrit sur une page qui porte un
 * autre nom, sans que rien n'indique que c'est le même endroit. Sur mobile, une
 * fois le menu refermé, le titre de page est le SEUL repère.
 *
 * L'URL `/jeune/mes-favoris` ne change pas : des liens sont déjà partagés, et
 * le mot « favoris » reste partout dans le code et l'API (`RessourceFavorite`,
 * `ressource-favori`) — invisible pour l'utilisateur. Ce test ne juge donc que
 * les libellés VISIBLES.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const RACINE = process.cwd()
const lire = (p: string) => readFileSync(resolve(RACINE, p), 'utf-8')

/** Le libellé porté par l'entrée de menu, lu à la source. */
function libelleSidebar(): string {
  const src = lire('src/components/layout/BenefSidebar/nav.ts')
  const ligne = src.split('\n').find((l) => l.includes("id: 'favoris'"))
  const m = ligne?.match(/label:\s*'([^']+)'/)
  if (!m) throw new Error('Entrée de menu « favoris » introuvable dans BenefSidebar')
  return m[1]
}

describe('GUIC-689 (É-21) — le menu et la page portent le même nom', () => {
  const attendu = libelleSidebar()

  it('le titre affiché de la page reprend le libellé du menu', () => {
    const src = lire('src/app/jeune/(app)/mes-favoris/page.tsx')
    expect(src).toMatch(new RegExp(`title="${attendu}"`))
  })

  it('le titre d’ONGLET aussi — c’est le nom vu dans l’historique et les favoris navigateur', () => {
    const src = lire('src/app/jeune/(app)/mes-favoris/page.tsx')
    expect(src).toMatch(new RegExp(`title:\\s*'${attendu}'`))
  })

  it('le lien de retour de la sous-page ressources aussi', () => {
    const src = lire('src/app/jeune/(app)/mes-favoris/ressources/page.tsx')
    expect(src).toMatch(new RegExp(`← ${attendu}`))
  })

  it('plus aucun « Mes favoris » visible sur ces deux écrans', () => {
    const ecrans = [
      'src/app/jeune/(app)/mes-favoris/page.tsx',
      'src/app/jeune/(app)/mes-favoris/ressources/page.tsx',
    ]
    const restants = ecrans.filter((f) => /Mes favoris/.test(lire(f)))
    expect(restants).toEqual([])
  })
})
