import { render, screen, fireEvent } from '@testing-library/react'
import { EventCard } from '@/components/evenements/EventCard'
import type { EvenementListItem } from '@/lib/loaders/evenements'

const baseItem: EvenementListItem = {
  id: 'ev1',
  titre: 'Atelier entrepreneuriat',
  description: 'Apprenez à monter votre projet',
  type: 'Atelier',
  statut: 'a_venir',
  dateDebut: '2026-07-15T10:30:00.000Z',
  dateFin: null,
  lieu: 'CJS Dakar',
  estGratuit: true,
  capaciteMax: 50,
  organisation: 'CJS Dakar',
}

describe('<EventCard />', () => {
  it('affiche le titre, le lieu et le type', () => {
    render(<EventCard item={baseItem} />)
    expect(screen.getByText('Atelier entrepreneuriat')).toBeInTheDocument()
    expect(screen.getByText('CJS Dakar', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Atelier')).toBeInTheDocument()
  })

  it('affiche le jour et le mois en bloc date', () => {
    const { container } = render(<EventCard item={baseItem} />)
    expect(container.textContent).toMatch(/15/)
    expect(container.textContent).toMatch(/JUIL/i)
  })

  it('marque "Gratuit" quand estGratuit=true', () => {
    render(<EventCard item={baseItem} />)
    expect(screen.getByText('Gratuit')).toBeInTheDocument()
  })

  it('ne rend pas le CTA si statut termine', () => {
    render(<EventCard item={{ ...baseItem, statut: 'termine' }} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  describe('GUIC-23 — boutons d\'inscription', () => {
    it('non authentifié : affiche "Se connecter pour s\'inscrire"', () => {
      render(<EventCard item={baseItem} isAuthenticated={false} />)
      expect(
        screen.getByRole('button', { name: /se connecter pour s'inscrire à/i }),
      ).toBeInTheDocument()
    })

    it('authentifié non inscrit : affiche "S\'inscrire"', () => {
      render(<EventCard item={baseItem} isAuthenticated isInscrit={false} />)
      expect(screen.getByRole('button', { name: /s'inscrire à/i })).toBeInTheDocument()
      expect(screen.queryByText('Inscrit')).toBeNull()
    })

    it('authentifié inscrit : affiche "Se désinscrire" et le marqueur "Inscrit"', () => {
      render(<EventCard item={baseItem} isAuthenticated isInscrit />)
      expect(screen.getByRole('button', { name: /se désinscrire/i })).toBeInTheDocument()
      expect(screen.getByText('Inscrit')).toBeInTheDocument()
    })

    it('déclenche onInscrire avec l\'id au clic', () => {
      const onInscrire = jest.fn()
      render(
        <EventCard
          item={baseItem}
          isAuthenticated
          isInscrit={false}
          onInscrire={onInscrire}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /s'inscrire à/i }))
      expect(onInscrire).toHaveBeenCalledWith('ev1')
    })

    it('désactive le bouton en état pending', () => {
      render(<EventCard item={baseItem} isAuthenticated isPending />)
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })
})
