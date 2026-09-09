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

describe('GUIC-689 — aucun écran de ressources ne renvoie sur l’accueil', () => {
  const { readFileSync, readdirSync } = jest.requireActual('node:fs') as typeof import('node:fs')
  const { resolve, join } = jest.requireActual('node:path') as typeof import('node:path')

  /**
   * TOUS les écrans de ressources, pas seulement l'accueil.
   *
   * La version initiale de cette sentinelle ne lisait que `MediathequeHome.tsx`.
   * Un second lien mort — « ← Toutes les ressources » sur la fiche détail — a
   * donc survécu à la correction : même défaut, autre fichier. Une sentinelle
   * qui ne couvre qu'un fichier ne protège qu'un fichier.
   */
  function fichiersRessources(): string[] {
    const racines = [
      resolve(process.cwd(), 'src/components/ressources'),
      resolve(process.cwd(), 'src/app/(public)/ressources'),
    ]
    const out: string[] = []
    const marcher = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const c = join(d, e.name)
        if (e.isDirectory()) marcher(c)
        else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) out.push(c)
      }
    }
    racines.forEach(marcher)
    return out
  }

  const ecrans = fichiersRessources()

  it('le balayage couvre bien plusieurs fichiers', () => {
    // Garde-fou du garde-fou : une liste vide ferait passer le test suivant à vide.
    expect(ecrans.length).toBeGreaterThan(5)
  })

  it('aucun href interne ne retombe sur l’accueil médiathèque', () => {
    const morts: string[] = []
    for (const f of ecrans) {
      const src = readFileSync(f, 'utf-8')
      for (const m of src.matchAll(/href=["'](\/ressources[^"']*)["']/g)) {
        if (!decrireVueRessources(paramsDeLien(m[1])).afficherListe) {
          morts.push(`${f.replace(process.cwd() + '/', '')} → ${m[1]}`)
        }
      }
    }
    expect(morts).toEqual([])
  })
})
