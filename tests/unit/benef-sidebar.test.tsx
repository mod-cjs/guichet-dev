import { render, screen } from '@testing-library/react'
import { BenefSidebar } from '@/components/layout/BenefSidebar'

let mockPathname = '/'
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

describe('<BenefSidebar />', () => {
  beforeEach(() => {
    mockPathname = '/'
  })

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

  it('résout l\'item actif depuis le pathname (mes-candidatures)', () => {
    mockPathname = '/jeune/mes-candidatures'
    render(<BenefSidebar />)
    const active = screen.getByRole('link', { current: 'page' })
    expect(active).toHaveTextContent('Mes candidatures')
  })

  it('résout l\'item actif depuis le pathname (mes-favoris)', () => {
    mockPathname = '/jeune/mes-favoris'
    render(<BenefSidebar />)
    const active = screen.getByRole('link', { current: 'page' })
    expect(active).toHaveTextContent('Mes favoris')
  })

  it('inclut un item "Mes formations" → /jeune/mes-formations', () => {
    render(<BenefSidebar />)
    const link = screen.getByRole('link', { name: /Mes formations/i })
    expect(link).toHaveAttribute('href', '/jeune/mes-formations')
  })

  it('ne référence plus /jeune/parametres ni /jeune/favoris ni /jeune/candidatures', () => {
    const { container } = render(<BenefSidebar />)
    const hrefs = Array.from(container.querySelectorAll('a')).map(a => a.getAttribute('href'))
    expect(hrefs).not.toContain('/jeune/parametres')
    expect(hrefs).not.toContain('/jeune/favoris')
    expect(hrefs).not.toContain('/jeune/candidatures')
    expect(hrefs).toContain('/jeune/mes-favoris')
    expect(hrefs).toContain('/jeune/mes-candidatures')
  })

  it('rend les liens externes YEAH et E-learning avec target=_blank', () => {
    render(<BenefSidebar />)
    const yeah = screen.getByRole('link', { name: /YEAH \(ouvre dans un nouvel onglet\)/i })
    expect(yeah).toHaveAttribute('target', '_blank')
    expect(yeah).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(yeah).toHaveAttribute('href', 'https://yeah.consortiumjeunessesenegal.org')

    const elearning = screen.getByRole('link', { name: /E-learning \(ouvre dans un nouvel onglet\)/i })
    expect(elearning).toHaveAttribute('target', '_blank')
    expect(elearning).toHaveAttribute('href', 'https://elearning.guichetjeunesse.sn')
  })
})
