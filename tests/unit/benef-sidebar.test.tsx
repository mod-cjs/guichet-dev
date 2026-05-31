import { render, screen } from '@testing-library/react'
import { BenefSidebar } from '@/components/layout/BenefSidebar'

describe('<BenefSidebar />', () => {
  it('a role="navigation" et aria-label', () => {
    render(<BenefSidebar />)
    const nav = screen.getByRole('navigation', { name: /Navigation principale/i })
    expect(nav).toBeInTheDocument()
  })

  it('rend les items par défaut', () => {
    render(<BenefSidebar />)
    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.getByText(/Toutes les opportunités/i)).toBeInTheDocument()
    expect(screen.getByText('Mes candidatures')).toBeInTheDocument()
    expect(screen.getByText('Mon profil')).toBeInTheDocument()
  })

  it('marque l\'item actif via aria-current', () => {
    render(<BenefSidebar active="candidatures" />)
    const active = screen.getByRole('link', { current: 'page' })
    expect(active).toHaveTextContent('Mes candidatures')
  })

  it('rend le user chip quand userName fourni', () => {
    render(<BenefSidebar userName="Awa Diop" userInitials="AD" userMeta="Tambacounda" />)
    expect(screen.getByText('Awa Diop')).toBeInTheDocument()
    expect(screen.getByText('Tambacounda')).toBeInTheDocument()
    expect(screen.getByText('AD')).toBeInTheDocument()
  })

  it('omet le user chip quand pas d\'identité', () => {
    render(<BenefSidebar />)
    expect(screen.queryByText('Awa Diop')).not.toBeInTheDocument()
  })

  it('rend le CTA Yaye en pied', () => {
    render(<BenefSidebar />)
    expect(screen.getByText('Parler à Yaye')).toBeInTheDocument()
  })
})
