/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import {
  CentreEvenementsSection,
  type CentreEvenementSummary,
} from '@/components/centres/CentreEvenementsSection'

const evt: CentreEvenementSummary = {
  id: 'e1',
  titre: 'Atelier CV stage',
  type: 'Atelier',
  dateDebut: '2026-07-12T09:00:00Z',
  dateFin: '2026-07-12T12:00:00Z',
  lieu: 'CJS Tambacounda — Salle A',
}

describe('<CentreEvenementsSection />', () => {
  it('liste les événements avec titre + type badge + lien vers /agenda/[id]', () => {
    render(
      <CentreEvenementsSection
        centreSlug="cjs-tambacounda"
        evenements={[
          evt,
          { ...evt, id: 'e2', titre: 'Forum emploi', type: 'Forum' },
        ]}
      />,
    )
    const links = screen.getAllByRole('link', { name: /Atelier CV stage|Forum emploi/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/agenda/e1')
    expect(screen.getByText('Atelier')).toBeInTheDocument()
    expect(screen.getByText('Forum')).toBeInTheDocument()
  })

  it('affiche un empty state si aucun événement', () => {
    render(
      <CentreEvenementsSection
        centreSlug="cjs-tambacounda"
        evenements={[]}
      />,
    )
    expect(screen.getByText(/Aucun événement prévu/i)).toBeInTheDocument()
    // Pas de CTA "Voir tous" quand vide
    expect(
      screen.queryByRole('link', { name: /Voir tous les événements/i }),
    ).not.toBeInTheDocument()
  })

  it('rend les CTAs "Tout voir" et "Voir tous les événements" pointant vers /agenda?centre=<slug>', () => {
    render(
      <CentreEvenementsSection
        centreSlug="cjs-tambacounda"
        evenements={[evt]}
      />,
    )
    const ctaBottom = screen.getByRole('link', {
      name: /Voir tous les événements/i,
    })
    expect(ctaBottom).toHaveAttribute(
      'href',
      '/agenda?centre=cjs-tambacounda',
    )
    const ctaTop = screen.getByRole('link', { name: /Tout voir/i })
    expect(ctaTop).toHaveAttribute('href', '/agenda?centre=cjs-tambacounda')
  })
})
