/**
 * @jest-environment jsdom
 *
 * GUIC-709 — Ce que la fiche annonce comme mesures.
 *
 * Trois règles, une seule idée : n'afficher que ce qui est mesuré.
 *
 *  1. « 0 vue » était affiché tel quel. Un compteur à zéro n'informe de rien
 *     et donne l'impression d'une ressource délaissée alors qu'il traduit
 *     seulement l'absence de mesure.
 *  2. Le nombre de téléchargements suit la même règle.
 *  3. Le poids ne s'affiche que s'il a été relevé à la source.
 */
import { render, screen } from '@testing-library/react'
import { RessourceDetailHero } from '@/components/ressources/RessourceDetailHero'

const base = {
  id: 'r1',
  titre: 'Guide pour rédiger un CV efficace',
  description: '<p>Un guide.</p>',
  type: 'PDF' as const,
  theme: 'Emploi',
  url: 'https://exemple.org/g.pdf',
  vues: 0,
  niveau: null,
  langue: null,
  categorie: null,
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-01T10:00:00.000Z',
}

const rendre = (over: Record<string, unknown> = {}) =>
  render(<RessourceDetailHero detail={{ ...base, ...over } as never} />)

describe('GUIC-709 — la fiche n\'affiche que ce qui est mesuré', () => {
  it('tait le compteur de vues quand personne n\'a encore consulté', () => {
    rendre({ vues: 0 })
    expect(screen.queryByText(/0 vue/)).not.toBeInTheDocument()
  })

  it('affiche les vues dès qu\'il y en a', () => {
    rendre({ vues: 12 })
    expect(screen.getByText(/12 vues/)).toBeInTheDocument()
  })

  it('affiche les téléchargements quand il y en a', () => {
    rendre({ vues: 3, telechargements: 47 })
    expect(screen.getByText(/47 téléchargements/)).toBeInTheDocument()
  })

  it('tait les téléchargements à zéro', () => {
    rendre({ vues: 3, telechargements: 0 })
    expect(screen.queryByText(/téléchargement/)).not.toBeInTheDocument()
  })

  it('accorde le singulier', () => {
    rendre({ vues: 1, telechargements: 1 })
    expect(screen.getByText(/1 vue(?!s)/)).toBeInTheDocument()
    expect(screen.getByText(/1 téléchargement(?!s)/)).toBeInTheDocument()
  })

  it('affiche le poids relevé à la source', () => {
    rendre({ poidsOctets: 2_516_582 })
    expect(screen.getByText(/2,4 Mo/)).toBeInTheDocument()
  })

  it('n\'affiche aucun poids quand il n\'a pas pu être relevé', () => {
    rendre({ poidsOctets: null })
    expect(screen.queryByText(/Mo|Ko|Go/)).not.toBeInTheDocument()
  })
})
