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
    // 15 juillet — jour 15, mois "JUIL"
    expect(container.textContent).toMatch(/15/)
    expect(container.textContent).toMatch(/JUIL/i)
  })

  it('marque "Gratuit" quand estGratuit=true', () => {
    render(<EventCard item={baseItem} />)
    expect(screen.getByText('Gratuit')).toBeInTheDocument()
  })

  it('rend le CTA S\'inscrire pour les événements à venir', () => {
    render(<EventCard item={baseItem} />)
    expect(screen.getByRole('button', { name: /s'inscrire à/i })).toBeInTheDocument()
  })

  it('ne rend pas le CTA si statut termine', () => {
    render(<EventCard item={{ ...baseItem, statut: 'termine' }} />)
    expect(screen.queryByRole('button', { name: /s'inscrire à/i })).toBeNull()
  })

  it('déclenche onInscrire au clic CTA', () => {
    const onInscrire = jest.fn()
    render(<EventCard item={baseItem} onInscrire={onInscrire} />)
    fireEvent.click(screen.getByRole('button', { name: /s'inscrire à/i }))
    expect(onInscrire).toHaveBeenCalledWith('ev1')
  })
})
