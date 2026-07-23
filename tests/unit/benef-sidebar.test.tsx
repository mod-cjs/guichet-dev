import { render, screen } from '@testing-library/react'
import { BenefSidebar } from '@/components/layout/BenefSidebar'

let mockPathname = '/'
let mockSearch = new URLSearchParams()
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearch,
}))

describe('<BenefSidebar />', () => {
  beforeEach(() => {
    mockPathname = '/'
    mockSearch = new URLSearchParams()
  })

  it('a role="navigation" et aria-label', () => {
    render(<BenefSidebar />)
    const nav = screen.getByRole('navigation', { name: /Navigation principale/i })
    expect(nav).toBeInTheDocument()
  })

  it('rend les items par défaut', () => {
    render(<BenefSidebar />)
    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.getByText('Toutes')).toBeInTheDocument()
    expect(screen.getByText('Mes candidatures')).toBeInTheDocument()
  })

  // GUIC-416 — conformité Lot 3 design : la section Opportunités expose les
  // sous-types (Emploi & Stages, Bourses & Financement, Formations,
  // Concours & Appels) en plus de « Toutes » et « Mes favoris ».
  it('section "Opportunités" : expose les 6 sous-items du design Lot 3', () => {
    render(<BenefSidebar />)
    expect(screen.getByRole('link', { name: /Toutes/i })).toHaveAttribute(
      'href',
      '/opportunites',
    )
    expect(
      screen.getByRole('link', { name: /Emploi & Stages/i }),
    ).toHaveAttribute('href', '/opportunites?type=Emploi')
    expect(
      screen.getByRole('link', { name: /Bourses & Financement/i }),
    ).toHaveAttribute('href', '/opportunites?type=Bourse')
    expect(screen.getByRole('link', { name: /^Formations$/i })).toHaveAttribute(
      'href',
      '/opportunites?type=Formation',
    )
    expect(
      screen.getByRole('link', { name: /Concours & Appels/i }),
    ).toHaveAttribute('href', '/opportunites?type=Appel_a_projets')
    expect(screen.getByRole('link', { name: /Mes favoris/i })).toHaveAttribute(
      'href',
      '/jeune/mes-favoris',
    )
  })

  it('active state : pathname=/opportunites + ?type=Emploi → item "Emploi & Stages" actif', () => {
    mockPathname = '/opportunites'
    mockSearch = new URLSearchParams('type=Emploi')
    render(<BenefSidebar />)
    const active = screen.getByRole('link', { current: 'page' })
    expect(active).toHaveTextContent('Emploi & Stages')
  })

  it('active state : pathname=/opportunites sans type → item "Toutes" actif', () => {
    mockPathname = '/opportunites'
    mockSearch = new URLSearchParams()
    render(<BenefSidebar />)
    const active = screen.getByRole('link', { current: 'page' })
    expect(active).toHaveTextContent('Toutes')
  })

  it('n\'affiche plus d\'item "Mon profil" dans le menu (carte profil unique — GUIC-376)', () => {
    render(<BenefSidebar />)
    expect(screen.queryByText('Mon profil')).not.toBeInTheDocument()
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

  // GUIC-581 — le CTA Yaye du pied de sidebar est remplacé par l'entrée
  // Inclusion & accessibilité (Yaye reste accessible via la bulle flottante,
  // même drawer YayeSidePanel — GUIC-376).
  it('ne rend plus le CTA Yaye en pied (remplacé — GUIC-581)', () => {
    render(<BenefSidebar />)
    expect(screen.queryByText('Parler à Yaye')).not.toBeInTheDocument()
  })

  it('rend le lien Inclusion & accessibilité en pied → /jeune/accessibilite', () => {
    render(<BenefSidebar />)
    const link = screen.getByRole('link', { name: /inclusion & accessibilité/i })
    expect(link).toHaveAttribute('href', '/jeune/accessibilite')
    expect(link).toHaveTextContent(/adapter l.application/i)
  })

  it('marque le lien Inclusion actif quand pathname=/jeune/accessibilite', () => {
    mockPathname = '/jeune/accessibilite'
    render(<BenefSidebar />)
    const link = screen.getByRole('link', { name: /inclusion & accessibilité/i })
    expect(link).toHaveAttribute('aria-current', 'page')
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
})
