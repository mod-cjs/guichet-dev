import { render, screen } from '@testing-library/react'
import { WebDashEvents, type DashEventItem } from '@/components/dashboard/WebDashEvents'

const items: DashEventItem[] = [
  { id: '1', day: 22, month: 'Mai', title: 'Atelier CV',     subtitle: '14h–17h', href: '/agenda/1' },
  { id: '2', day: 28, month: 'Mai', title: 'Forum Diamniadio', subtitle: '9h–18h', href: '/agenda/2' },
]

describe('<WebDashEvents />', () => {
  it('rend le titre du bloc', () => {
    render(<WebDashEvents items={items} />)
    expect(screen.getByRole('heading', { name: /Événements à venir/i })).toBeInTheDocument()
  })

  it('rend chaque événement avec sa date et son titre', () => {
    render(<WebDashEvents items={items} />)
    expect(screen.getByText('Atelier CV')).toBeInTheDocument()
    expect(screen.getByText('Forum Diamniadio')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
    expect(screen.getByText('28')).toBeInTheDocument()
  })

  it('affiche un état vide quand pas d\'événements', () => {
    render(<WebDashEvents items={[]} />)
    expect(screen.getByText(/Aucun événement à venir/i)).toBeInTheDocument()
  })

  it('rend un lien "Voir tous"', () => {
    render(<WebDashEvents items={items} />)
    expect(screen.getByRole('link', { name: /Voir tous/i })).toHaveAttribute('href', '/jeune/agenda')
  })
})
