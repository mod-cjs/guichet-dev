/**
 * GUIC-689 (Lot F2) — écran d'accueil médiathèque `<MediathequeHome />`.
 *
 * Couvre :
 *  - hero + recherche (formulaire GET natif vers /ressources ?q=)
 *  - grille « Explorer par catégorie » (theme + compte + lien)
 *  - étagère « Ajoutées récemment » (PAS « Mises en avant »)
 *  - étagère « Les plus consultées » (PAS « téléchargés ») avec rangs 1..N
 *  - état vide (aucune catégorie/étagère)
 */
import { render, screen, within } from '@testing-library/react'
import type { ComponentType } from 'react'
import type { RessourceListItem } from '@/lib/loaders/ressources'

/** Reflet local et minimal du contrat attendu (le fichier réel n'existe pas
 *  encore — commit RED). Évite un `import type` sur un module inexistant,
 *  que `tsc` résoudrait et ferait échouer au même titre qu'un `import`. */
interface MediathequeHomeProps {
  categories: Array<{ theme: string; count: number }>
  recentes: RessourceListItem[]
  populaires: RessourceListItem[]
}

/**
 * GUIC-689 — commit RED : `MediathequeHome` n'existe pas encore
 * (implémentation à suivre dans le commit GREEN). `require()` n'est pas
 * résolu statiquement par tsc (contrairement à `import`), ce qui permet
 * d'écrire le test AVANT le composant sans casser `tsc --noEmit` — le
 * comportement, lui, échoue bien à l'exécution (RED réel, prouvé).
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MediathequeHome } = require('@/components/ressources/MediathequeHome') as {
  MediathequeHome: ComponentType<MediathequeHomeProps>
}

function makeItem(overrides: Partial<RessourceListItem>): RessourceListItem {
  return {
    id: 'r',
    titre: 'Ressource',
    description: 'desc',
    type: 'PDF',
    theme: 'Emploi',
    url: 'https://exemple.org/x',
    vues: 0,
    niveau: null,
    langue: null,
    categorie: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('<MediathequeHome />', () => {
  it('rend le bandeau hero avec le titre et le formulaire de recherche', () => {
    render(<MediathequeHome categories={[]} recentes={[]} populaires={[]} />)
    expect(
      screen.getByRole('heading', { level: 1, name: /Médiathèque du Guichet Jeunesse/ }),
    ).toBeInTheDocument()

    const input = screen.getByLabelText('Rechercher un guide, un modèle…') as HTMLInputElement
    expect(input.name).toBe('q')
    expect(input.closest('form')).toHaveAttribute('method', 'GET')
    expect(input.closest('form')).toHaveAttribute('action', '/ressources')
  })

  it('rend la grille « Explorer par catégorie » avec compte et lien par thème', () => {
    render(
      <MediathequeHome
        categories={[
          { theme: 'Emploi', count: 6 },
          { theme: 'Entrepreneuriat', count: 5 },
        ]}
        recentes={[]}
        populaires={[]}
      />,
    )
    expect(screen.getByText('Explorer par catégorie')).toBeInTheDocument()
    expect(screen.getByText('Emploi')).toBeInTheDocument()
    expect(screen.getByText('6 ressources')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /Explorer la catégorie Emploi/ })
    expect(link).toHaveAttribute('href', '/ressources?theme=Emploi')
  })

  it('rend « Ajoutées récemment » (jamais « Mises en avant ») avec les items', () => {
    render(
      <MediathequeHome
        categories={[]}
        recentes={[makeItem({ id: 'r1', titre: 'Guide CV' })]}
        populaires={[]}
      />,
    )
    expect(screen.getByText('Ajoutées récemment')).toBeInTheDocument()
    expect(screen.queryByText('Mises en avant')).not.toBeInTheDocument()
    expect(screen.getByText('Guide CV')).toBeInTheDocument()
  })

  it('rend « Les plus consultées » (jamais « téléchargés ») avec des rangs numérotés', () => {
    render(
      <MediathequeHome
        categories={[]}
        recentes={[]}
        populaires={[
          makeItem({ id: 'p1', titre: 'Ressource populaire 1', vues: 42 }),
          makeItem({ id: 'p2', titre: 'Ressource populaire 2', vues: 10 }),
        ]}
      />,
    )
    expect(screen.getByText('Les plus consultées')).toBeInTheDocument()
    expect(screen.queryByText(/téléchargé/i)).not.toBeInTheDocument()

    const list = screen.getByText('Les plus consultées').closest('section') as HTMLElement
    expect(within(list).getByText('1')).toBeInTheDocument()
    expect(within(list).getByText('2')).toBeInTheDocument()
  })

  it("affiche un état vide quand il n'y a ni catégorie ni ressource", () => {
    render(<MediathequeHome categories={[]} recentes={[]} populaires={[]} />)
    expect(screen.getByText('Aucune ressource publiée pour le moment')).toBeInTheDocument()
    expect(screen.queryByText('Explorer par catégorie')).not.toBeInTheDocument()
  })

  it('« Ajoutées récemment » — Tout voir renvoie vers le filtre de date existant (?date=recent)', () => {
    render(
      <MediathequeHome
        categories={[]}
        recentes={[makeItem({ id: 'r1' })]}
        populaires={[]}
      />,
    )
    expect(screen.getByRole('link', { name: /Tout voir/ })).toHaveAttribute(
      'href',
      '/ressources?date=recent',
    )
  })

  it('« Les plus consultées » — le lien de bas de liste ne prétend pas garder le tri par vues', () => {
    render(
      <MediathequeHome
        categories={[]}
        recentes={[]}
        populaires={[makeItem({ id: 'p1' })]}
      />,
    )
    expect(screen.getByRole('link', { name: /Toutes les ressources/ })).toHaveAttribute(
      'href',
      '/ressources',
    )
  })
})
