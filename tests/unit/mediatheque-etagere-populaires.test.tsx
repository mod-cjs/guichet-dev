/**
 * @jest-environment jsdom
 *
 * GUIC-689 — « Les plus consultées » ne doit pas inventer un palmarès.
 *
 * Constaté au rendu : les deux étagères de l'accueil affichaient EXACTEMENT les
 * mêmes ressources, dans le même ordre, avec des pastilles 1 à 5 sur la seconde.
 *
 * Cause vérifiée en base : 19 ressources sur 20 ont zéro vue. Le tri
 * `vues desc, createdAt desc` retombe donc sur la date — le même ordre que
 * « Ajoutées récemment ». Le classement affiché ne reposait sur rien.
 *
 * Règle retenue, la même que pour la durée de fréquentation : sans mesure, on
 * ne classe pas. La section disparaît plutôt que d'afficher un ordre arbitraire
 * sous une numérotation qui lui donne l'autorité d'un palmarès.
 */
import { render, screen } from '@testing-library/react'

import { MediathequeHome } from '@/components/ressources/MediathequeHome'

const item = (id: string, titre: string, vues: number) => ({
  id, titre, description: 'x', type: 'PDF' as const, theme: 'Emploi',
  url: 'https://example.org/x.pdf', vues, niveau: null, langue: null, categorie: null,
  createdAt: '2026-04-01T10:00:00.000Z',
})

const base = { categories: [], recentes: [], populaires: [] }

describe('GUIC-689 — étagère « Les plus consultées »', () => {
  it('masquée quand AUCUNE ressource n’a été consultée', () => {
    render(
      <MediathequeHome
        {...base}
        recentes={[item('a', 'Guide A', 0), item('b', 'Guide B', 0)]}
        populaires={[item('a', 'Guide A', 0), item('b', 'Guide B', 0)]}
      />,
    )
    expect(screen.queryByText(/Les plus consultées/i)).toBeNull()
  })

  it('affichée dès qu’une consultation réelle existe', () => {
    render(
      <MediathequeHome
        {...base}
        recentes={[item('a', 'Guide A', 0)]}
        populaires={[item('a', 'Guide A', 7)]}
      />,
    )
    expect(screen.getByText(/Les plus consultées/i)).toBeInTheDocument()
  })

  it('ne classe QUE les ressources réellement consultées', () => {
    render(
      <MediathequeHome
        {...base}
        recentes={[]}
        populaires={[item('a', 'Vue sept fois', 7), item('b', 'Jamais vue', 0)]}
      />,
    )
    expect(screen.getByText('Vue sept fois')).toBeInTheDocument()
    // Une ressource à zéro vue n'a pas sa place dans un palmarès de consultation.
    expect(screen.queryByText('Jamais vue')).toBeNull()
  })

  it('« Ajoutées récemment » reste affichée, elle repose sur une date réelle', () => {
    render(<MediathequeHome {...base} recentes={[item('a', 'Guide A', 0)]} populaires={[]} />)
    expect(screen.getByText(/Ajoutées récemment/i)).toBeInTheDocument()
  })
})
