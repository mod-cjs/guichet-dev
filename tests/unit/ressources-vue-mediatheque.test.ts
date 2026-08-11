/**
 * @jest-environment node
 *
 * GUIC-689 — « Toutes les ressources → » ne menait nulle part.
 *
 * Le Lot F2 a introduit une bascule franche sur `/ressources` : sans filtre
 * actif, on affiche l'accueil médiathèque ; dès qu'un filtre existe, la vue
 * liste. L'accueil porte un lien « Toutes les ressources → » pointant sur
 * `/ressources` **nu** — donc sans filtre, donc sur l'accueil lui-même. Le lien
 * réaffichait la page qu'on regardait déjà.
 *
 * Un contrôle qui ne change rien à l'écran est un contrôle mort : l'utilisateur
 * clique, rien ne bouge, et rien ne lui dit pourquoi.
 *
 * Aucun filtre n'exprimait « tout » : `date=all` est explicitement traité comme
 * l'absence de filtre, et `page=1` aussi. D'où `vue=liste`, une bascule
 * explicite — le seul moyen d'atteindre la liste complète sans la restreindre.
 *
 * La règle d'aiguillage est testée ICI plutôt que dans le composant de page :
 * le test peut ainsi donner au routeur l'URL RÉELLE du lien et vérifier où elle
 * mène, au lieu de figer une chaîne en dur des deux côtés.
 */
import { decrireVueRessources } from '@/lib/ressources/vue'

/** Transforme une URL de lien en la forme que Next passe à la page. */
function paramsDeLien(href: string): Record<string, string | string[] | undefined> {
  const search = new URLSearchParams(href.split('?')[1] ?? '')
  const out: Record<string, string | string[] | undefined> = {}
  for (const cle of new Set(search.keys())) {
    const valeurs = search.getAll(cle)
    out[cle] = valeurs.length > 1 ? valeurs : valeurs[0]
  }
  return out
}

describe('GUIC-689 — aiguillage accueil médiathèque / vue liste', () => {
  it('sans aucun paramètre → accueil médiathèque', () => {
    expect(decrireVueRessources({}).afficherListe).toBe(false)
  })

  it('`date=all` ne compte pas comme un filtre — c’est le défaut', () => {
    expect(decrireVueRessources({ date: 'all' }).afficherListe).toBe(false)
  })

  it('`page=1` non plus', () => {
    expect(decrireVueRessources({ page: '1' }).afficherListe).toBe(false)
  })

  it('un type valide bascule sur la liste', () => {
    expect(decrireVueRessources({ type: 'PDF' }).afficherListe).toBe(true)
  })

  it('un type INVALIDE ne bascule pas — il est rejeté, donc il ne filtre rien', () => {
    // Sinon on afficherait une liste « filtrée » par un critère ignoré.
    expect(decrireVueRessources({ type: 'nimporte-quoi' }).afficherListe).toBe(false)
  })

  it('`vue=liste` bascule explicitement, sans rien filtrer', () => {
    const vue = decrireVueRessources({ vue: 'liste' })
    expect(vue.afficherListe).toBe(true)
    expect(vue.filtres.type).toBeUndefined()
    expect(vue.filtres.q).toBeUndefined()
    expect(vue.filtres.date).toBe('all')
  })

  it('les filtres restent lus comme avant', () => {
    const { filtres } = decrireVueRessources({ q: ' emploi ', page: '3', categorie: ['a', 'b'] })
    expect(filtres.q).toBe('emploi')
    expect(filtres.page).toBe(3)
    expect(filtres.categories).toEqual(['a', 'b'])
  })
})

describe('GUIC-689 — le lien « Toutes les ressources » mène à la liste', () => {
  const { readFileSync } = jest.requireActual('node:fs') as typeof import('node:fs')
  const { resolve } = jest.requireActual('node:path') as typeof import('node:path')

  const src = readFileSync(
    resolve(process.cwd(), 'src/components/ressources/MediathequeHome.tsx'),
    'utf-8',
  )

  /** Tous les href internes vers /ressources portés par l'accueil. */
  const liens = [...src.matchAll(/href=["'](\/ressources[^"']*)["']/g)].map((m) => m[1])

  it('l’accueil porte au moins un lien vers /ressources', () => {
    expect(liens.length).toBeGreaterThan(0)
  })

  it('AUCUN de ces liens ne renvoie sur l’accueil lui-même', () => {
    const morts = liens.filter((href) => !decrireVueRessources(paramsDeLien(href)).afficherListe)
    expect(morts).toEqual([])
  })
})
