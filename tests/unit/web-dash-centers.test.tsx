import { render, screen } from '@testing-library/react'
import { WebDashCenters, type DashCenterItem } from '@/components/dashboard/WebDashCenters'

const centers: DashCenterItem[] = [
  { id: 'c1', name: 'CJS Tambacounda', address: 'Av. LSS · wifi gratuit', distance: '2.4 km', href: '/centres/c1' },
  { id: 'c2', name: 'CJS Kédougou',    address: 'Quartier Lawol',         distance: '189 km', href: '/centres/c2' },
]

describe('<WebDashCenters />', () => {
  it('rend le titre du bloc', () => {
    render(<WebDashCenters items={centers} />)
    expect(screen.getByRole('heading', { name: /Centres CJS près de toi/i })).toBeInTheDocument()
  })

  it('rend chaque centre avec son nom, adresse et distance', () => {
    render(<WebDashCenters items={centers} />)
    expect(screen.getByText('CJS Tambacounda')).toBeInTheDocument()
    expect(screen.getByText('2.4 km')).toBeInTheDocument()
    expect(screen.getByText('CJS Kédougou')).toBeInTheDocument()
    expect(screen.getByText('189 km')).toBeInTheDocument()
  })

  it('rend un lien Carte', () => {
    render(<WebDashCenters items={centers} />)
    expect(screen.getByRole('link', { name: /Carte/i })).toHaveAttribute('href', '/centres')
  })

  it('affiche un état vide quand aucun centre', () => {
    render(<WebDashCenters items={[]} />)
    expect(screen.getByText(/Aucun centre à proximité/i)).toBeInTheDocument()
  })
})
