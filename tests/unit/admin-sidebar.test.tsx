/**
 * GUIC-450 — AdminSidebar Lot 11 (sombre + doré)
 * Tests RED : assertions sur le chrome admin design v3.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

let mockPathname = '/admin/tableau-de-bord'
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

describe('GUIC-450 — AdminSidebar Lot 11 chrome sombre+doré', () => {
  beforeEach(() => {
    mockPathname = '/admin/tableau-de-bord'
  })

  /* ── 7 liens exacts avec hrefs ──────────────────────────────────────────── */
  it('rend le lien "Tableau de bord" vers /admin/tableau-de-bord', () => {
    render(<AdminSidebar />)
    const link = screen.getAllByRole('link', { name: /tableau de bord/i })[0]
    expect(link).toHaveAttribute('href', '/admin/tableau-de-bord')
  })

  it('rend le lien "Centres CJS" vers /admin/centres', () => {
    render(<AdminSidebar />)
    const link = screen.getAllByRole('link', { name: /centres cjs/i })[0]
    expect(link).toHaveAttribute('href', '/admin/centres')
  })

  it('rend le lien "Utilisateurs" vers /admin/utilisateurs', () => {
    render(<AdminSidebar />)
    const link = screen.getAllByRole('link', { name: /utilisateurs/i })[0]
    expect(link).toHaveAttribute('href', '/admin/utilisateurs')
  })

  // G11 — la page analytics centres n'est plus orpheline : lien de nav présent.
  it('rend le lien "Analytics centres" vers /admin/analytics/centres', () => {
    render(<AdminSidebar />)
    const link = screen.getAllByRole('link', { name: /analytics centres/i })[0]
    expect(link).toHaveAttribute('href', '/admin/analytics/centres')
  })

  it('rend le lien "Statistiques" vers /admin/data-hub', () => {
    render(<AdminSidebar />)
    const link = screen.getAllByRole('link', { name: /statistiques/i })[0]
    expect(link).toHaveAttribute('href', '/admin/data-hub')
  })

  it('rend le lien "Modération" vers /admin/opportunites', () => {
    render(<AdminSidebar />)
    const link = screen.getAllByRole('link', { name: /modération/i })[0]
    expect(link).toHaveAttribute('href', '/admin/opportunites')
  })

  it('rend le lien "Événements" vers /admin/evenements', () => {
    render(<AdminSidebar />)
    const link = screen.getAllByRole('link', { name: /événements/i })[0]
    expect(link).toHaveAttribute('href', '/admin/evenements')
  })

  it('rend le lien "Contenu" vers /admin/ressources', () => {
    render(<AdminSidebar />)
    const link = screen.getAllByRole('link', { name: /contenu/i })[0]
    expect(link).toHaveAttribute('href', '/admin/ressources')
  })

  /* ── G9 — badge modération alimenté par le compteur de brouillons ────────── */
  it('affiche le badge rouge sur Modération quand moderationCount > 0', () => {
    render(<AdminSidebar moderationCount={7} />)
    const link = screen.getAllByRole('link', { name: /modération/i })[0]
    expect(link.textContent).toContain('7')
  })

  it('n’affiche aucun badge quand moderationCount = 0', () => {
    render(<AdminSidebar moderationCount={0} />)
    const link = screen.getAllByRole('link', { name: /modération/i })[0]
    expect(link.textContent).not.toMatch(/\d/)
  })

  /* ── Section headers ────────────────────────────────────────────────────── */
  it('affiche le header de section "Pilotage"', () => {
    render(<AdminSidebar />)
    expect(screen.getByText('Pilotage')).toBeInTheDocument()
  })

  it('affiche le header de section "Gouvernance"', () => {
    render(<AdminSidebar />)
    expect(screen.getByText('Gouvernance')).toBeInTheDocument()
  })

  /* ── Item actif gold class ──────────────────────────────────────────────── */
  it('marque l\'item actif avec aria-current="page"', () => {
    mockPathname = '/admin/tableau-de-bord'
    render(<AdminSidebar />)
    const active = screen.getAllByRole('link', { current: 'page' })
    expect(active.length).toBeGreaterThan(0)
    expect(active[0]).toHaveTextContent(/tableau de bord/i)
  })

  it('marque Utilisateurs actif quand pathname = /admin/utilisateurs', () => {
    mockPathname = '/admin/utilisateurs'
    render(<AdminSidebar />)
    const active = screen.getAllByRole('link', { current: 'page' })
    expect(active.some(a => /utilisateurs/i.test(a.textContent ?? ''))).toBe(true)
  })

  it('applique la classe/style gold sur l\'item actif', () => {
    mockPathname = '/admin/centres'
    render(<AdminSidebar />)
    const active = screen.getAllByRole('link', { current: 'page' })
    const activeCentres = active.find(a => /centres cjs/i.test(a.textContent ?? ''))
    expect(activeCentres).toBeDefined()
    // L'item actif porte le gradient doré --gj-admin-gold via inline style (rendu
    // navigateur). jsdom n'évalue pas var() sur le shorthand `background`, donc on
    // vérifie le marqueur d'état actif data-active (la branche linkActiveStyle est prise).
    expect(activeCentres).toHaveAttribute('data-active', 'true')
    // Et la font-weight 800 de l'item actif est bien sérialisée (preuve du spread actif).
    const style = (activeCentres as HTMLElement).getAttribute('style') ?? ''
    expect(style).toMatch(/font-weight:\s*800/i)
  })

  /* ── Pas de bottom-nav ──────────────────────────────────────────────────── */
  it('ne rend pas de bottom-nav (règle absolue admin = pas de bottom-nav)', () => {
    render(<AdminSidebar />)
    expect(screen.queryByTestId('bottom-nav')).toBeNull()
    // On s'assure qu'il y a exactement 1 landmark nav (la sidebar)
    const navs = screen.getAllByRole('navigation')
    expect(navs.length).toBe(1)
  })

  /* ── Déconnexion en footer ──────────────────────────────────────────────── */
  it('a un lien "Se déconnecter" en footer', () => {
    render(<AdminSidebar />)
    expect(screen.getByText(/se déconnecter/i)).toBeInTheDocument()
  })

  /* ── Drawer mobile ──────────────────────────────────────────────────────── */
  it('hamburger mobile a aria-expanded="false" par défaut', () => {
    render(<AdminSidebar />)
    expect(screen.getByLabelText(/ouvrir le menu/i)).toHaveAttribute('aria-expanded', 'false')
  })

  it('hamburger clic ouvre la sidebar (aria-expanded="true")', async () => {
    render(<AdminSidebar />)
    const btn = screen.getByLabelText(/ouvrir le menu/i)
    await userEvent.setup().click(btn)
    expect(screen.getByLabelText(/fermer le menu/i)).toHaveAttribute('aria-expanded', 'true')
  })

  it('ESC ferme la sidebar quand ouverte', async () => {
    render(<AdminSidebar />)
    const u = userEvent.setup()
    await u.click(screen.getByLabelText(/ouvrir le menu/i))
    await u.keyboard('{Escape}')
    expect(screen.getByLabelText(/ouvrir le menu/i)).toHaveAttribute('aria-expanded', 'false')
  })

  /* ── Label « Admin national » ───────────────────────────────────────────── */
  it('affiche le label "Admin national" dans le header', () => {
    render(<AdminSidebar />)
    expect(screen.getByText(/admin national/i)).toBeInTheDocument()
  })
})
