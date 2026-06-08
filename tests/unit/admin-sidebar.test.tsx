import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

let mockPathname = '/admin/tableau-de-bord'
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

describe('GUIC-204 — AdminSidebar', () => {
  beforeEach(() => {
    mockPathname = '/admin/tableau-de-bord'
  })

  it('rend le header "Administration CJS"', () => {
    render(<AdminSidebar />)
    expect(screen.getAllByText(/Administration/i).length).toBeGreaterThan(0)
  })

  it('a 7 items de navigation (Tableau de bord + 5 modération + 1 système)', () => {
    render(<AdminSidebar />)
    expect(screen.getAllByText('Tableau de bord').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Utilisateurs').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Opportunités').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Événements').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ressources').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Centres').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Data Hub').length).toBeGreaterThan(0)
  })

  it('a un lien "Se déconnecter" en footer', () => {
    render(<AdminSidebar />)
    expect(screen.getAllByText(/Se déconnecter/i).length).toBeGreaterThan(0)
  })

  it('hamburger mobile a aria-expanded="false" par défaut', () => {
    render(<AdminSidebar />)
    expect(screen.getByLabelText(/Ouvrir le menu/i)).toHaveAttribute('aria-expanded', 'false')
  })

  it('hamburger clic ouvre la sidebar (aria-expanded="true")', async () => {
    render(<AdminSidebar />)
    const btn = screen.getByLabelText(/Ouvrir le menu/i)
    await userEvent.setup().click(btn)
    expect(screen.getByLabelText(/Fermer le menu/i)).toHaveAttribute('aria-expanded', 'true')
  })

  it('ESC ferme la sidebar quand ouverte', async () => {
    render(<AdminSidebar />)
    const u = userEvent.setup()
    await u.click(screen.getByLabelText(/Ouvrir le menu/i))
    await u.keyboard('{Escape}')
    expect(screen.getByLabelText(/Ouvrir le menu/i)).toHaveAttribute('aria-expanded', 'false')
  })

  it("marque l'item actif via aria-current selon usePathname", () => {
    mockPathname = '/admin/utilisateurs'
    render(<AdminSidebar />)
    const actives = screen.getAllByRole('link', { current: 'page' })
    expect(actives.some(a => /Utilisateurs/.test(a.textContent ?? ''))).toBe(true)
  })
})
