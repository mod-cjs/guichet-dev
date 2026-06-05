import { render, screen, fireEvent } from '@testing-library/react'
import { BenefTopBar } from '@/components/layout/BenefTopBar'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (...args: unknown[]) => pushMock(...args) }),
}))

describe('<BenefTopBar />', () => {
  beforeEach(() => {
    pushMock.mockClear()
  })

  it('rend search + 3 actions + UserMenu', () => {
    render(<BenefTopBar userInitials="AD" userPrenom="Awa" userNom="Diop" />)
    expect(screen.getByRole('searchbox', { name: /Rechercher/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /favoris/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Notifications/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Aide/i })).toBeInTheDocument()
    // UserMenu — aria-label inclut prénom + nom
    expect(screen.getByRole('button', { name: /Menu utilisateur/i })).toBeInTheDocument()
  })

  it('appelle onSearchChange', () => {
    const onChange = jest.fn()
    render(<BenefTopBar searchQuery="" onSearchChange={onChange} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'stage' } })
    expect(onChange).toHaveBeenCalledWith('stage')
  })

  it('affiche le badge unread', () => {
    render(<BenefTopBar unread={5} />)
    expect(screen.getByLabelText(/5 non lues/i)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('affiche le badge bookmark', () => {
    render(<BenefTopBar bookmarkCount={12} />)
    expect(screen.getByLabelText(/12 sauvegardés/i)).toBeInTheDocument()
  })

  it('plafonne unread à 99+', () => {
    render(<BenefTopBar unread={200} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('appelle les click handlers', () => {
    const onBookmark = jest.fn()
    const onBell = jest.fn()
    const onInfo = jest.fn()
    render(
      <BenefTopBar
        userInitials="AD"
        userPrenom="Awa"
        userNom="Diop"
        onBookmarkClick={onBookmark}
        onBellClick={onBell}
        onInfoClick={onInfo}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /favoris/i }))
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
    fireEvent.click(screen.getByRole('button', { name: /Aide/i }))
    expect(onBookmark).toHaveBeenCalled()
    expect(onBell).toHaveBeenCalled()
    expect(onInfo).toHaveBeenCalled()
  })

  it('ouvre le UserMenu (profil + déconnexion)', () => {
    render(<BenefTopBar userInitials="AD" userPrenom="Awa" userNom="Diop" />)
    fireEvent.click(screen.getByRole('button', { name: /Menu utilisateur/i }))
    expect(screen.getByRole('menuitem', { name: /Mon profil/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /déconnecter/i })).toBeInTheDocument()
  })

  it('navigue vers /opportunites?q= au submit du formulaire', () => {
    render(<BenefTopBar />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'data science' } })
    fireEvent.submit(input.closest('form')!)
    expect(pushMock).toHaveBeenCalledWith('/opportunites?q=data%20science')
  })

  it('ignore la soumission si query vide', () => {
    render(<BenefTopBar />)
    const input = screen.getByRole('searchbox')
    fireEvent.submit(input.closest('form')!)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('appelle onSearchSubmit si fourni au lieu de naviguer', () => {
    const onSubmit = jest.fn()
    render(<BenefTopBar onSearchSubmit={onSubmit} />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'stage' } })
    fireEvent.submit(input.closest('form')!)
    expect(onSubmit).toHaveBeenCalledWith('stage')
    expect(pushMock).not.toHaveBeenCalled()
  })
})
