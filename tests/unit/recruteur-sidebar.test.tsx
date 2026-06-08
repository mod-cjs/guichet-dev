import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecruteurSidebar } from '@/components/layout/RecruteurSidebar'

let mockPathname = '/recruteur/tableau-de-bord'
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

describe('GUIC-204 — RecruteurSidebar', () => {
  beforeEach(() => {
    mockPathname = '/recruteur/tableau-de-bord'
  })

  it('rend le header "Espace Recruteur"', () => {
    render(<RecruteurSidebar />)
    expect(screen.getAllByText(/Espace Recruteur/i).length).toBeGreaterThan(0)
  })

  it('a 3 items de navigation (Tableau de bord + Mes offres + Candidatures)', () => {
    render(<RecruteurSidebar />)
    expect(screen.getAllByText('Tableau de bord').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mes offres').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Candidatures/i).length).toBeGreaterThan(0)
  })

  it('a un lien "Se déconnecter" en footer', () => {
    render(<RecruteurSidebar />)
    expect(screen.getAllByText(/Se déconnecter/i).length).toBeGreaterThan(0)
  })

  it('hamburger mobile a aria-expanded="false" par défaut', () => {
    render(<RecruteurSidebar />)
    expect(screen.getByLabelText(/Ouvrir le menu/i)).toHaveAttribute('aria-expanded', 'false')
  })

  it('hamburger clic ouvre la sidebar (aria-expanded="true")', async () => {
    render(<RecruteurSidebar />)
    const btn = screen.getByLabelText(/Ouvrir le menu/i)
    await userEvent.setup().click(btn)
    expect(screen.getByLabelText(/Fermer le menu/i)).toHaveAttribute('aria-expanded', 'true')
  })

  it('ESC ferme la sidebar quand ouverte', async () => {
    render(<RecruteurSidebar />)
    const u = userEvent.setup()
    await u.click(screen.getByLabelText(/Ouvrir le menu/i))
    await u.keyboard('{Escape}')
    expect(screen.getByLabelText(/Ouvrir le menu/i)).toHaveAttribute('aria-expanded', 'false')
  })

  it("marque l'item actif via aria-current selon usePathname", () => {
    mockPathname = '/recruteur/mes-offres'
    render(<RecruteurSidebar />)
    const actives = screen.getAllByRole('link', { current: 'page' })
    expect(actives.some(a => /Mes offres/.test(a.textContent ?? ''))).toBe(true)
  })
})
