import { render, screen, fireEvent } from '@testing-library/react'
import { AppTopbar } from '@/components/layout/AppTopbar'

// AppTopbar peut rendre <UserMenu> (client) qui utilise next/navigation.
// On mocke pour éviter les setup providers.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/jeune/tableau-de-bord',
}))

describe('<AppTopbar /> v2', () => {
  it('rend le logo, la cloche et le user button (plus de pill Yaye — GUIC-689)', () => {
    render(
      <AppTopbar
        userInitials="AD"
        onBellClick={() => undefined}
        onUserClick={() => undefined}
      />,
    )
    expect(screen.getByAltText(/Guichet/i)).toBeInTheDocument()
    // GUIC-689 — la pastille Yaye a été retirée : le bouton flottant est
    // l'unique point d'entrée IA permanent (règle non négociable v5).
    expect(screen.queryByLabelText(/Yaye/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Notifications/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Profil/i })).toBeInTheDocument()
  })

  it('affiche le badge unread quand > 0', () => {
    render(<AppTopbar userInitials="AD" unread={3} onBellClick={() => undefined} />)
    expect(screen.getByLabelText(/3 non lues/i)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('plafonne unread à 9+', () => {
    render(<AppTopbar userInitials="AD" unread={42} onBellClick={() => undefined} />)
    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('appelle les click handlers', () => {
    const onBell = jest.fn()
    const onUser = jest.fn()
    render(
      <AppTopbar
        userInitials="AD"
        onBellClick={onBell}
        onUserClick={onUser}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
    fireEvent.click(screen.getByRole('button', { name: /Profil/i }))
    expect(onBell).toHaveBeenCalled()
    expect(onUser).toHaveBeenCalled()
  })

  it('omet le user quand pas d\'initiales fournies', () => {
    render(<AppTopbar onBellClick={() => undefined} />)
    expect(screen.queryByRole('button', { name: /Profil/i })).not.toBeInTheDocument()
  })

  it('affiche le subtitle quand fourni', () => {
    render(<AppTopbar subtitle="Tableau de bord" onBellClick={() => undefined} />)
    expect(screen.getByText('Tableau de bord')).toBeInTheDocument()
  })
})
