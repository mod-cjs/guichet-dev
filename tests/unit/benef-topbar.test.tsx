import { render, screen, fireEvent } from '@testing-library/react'
import { BenefTopBar } from '@/components/layout/BenefTopBar'

describe('<BenefTopBar />', () => {
  it('rend search + 3 actions + avatar', () => {
    render(<BenefTopBar userInitials="AD" />)
    expect(screen.getByRole('searchbox', { name: /Rechercher/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /favoris/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Notifications/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Aide/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Profil/i })).toBeInTheDocument()
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

  it('expose un bouton Yaye qui ouvre le side panel', () => {
    render(<BenefTopBar userInitials="AD" />)
    const trigger = screen.getByRole('button', {
      name: /Ouvrir la conversation avec Yaye/i,
    })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: /Conversation avec Yaye/i })).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('notifie onYayeOpenChange en mode controlled', () => {
    const onChange = jest.fn()
    render(<BenefTopBar userInitials="AD" yayeOpen={false} onYayeOpenChange={onChange} />)
    fireEvent.click(
      screen.getByRole('button', { name: /Ouvrir la conversation avec Yaye/i }),
    )
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('appelle les click handlers', () => {
    const onBookmark = jest.fn()
    const onBell = jest.fn()
    const onInfo = jest.fn()
    const onUser = jest.fn()
    render(
      <BenefTopBar
        userInitials="AD"
        onBookmarkClick={onBookmark}
        onBellClick={onBell}
        onInfoClick={onInfo}
        onUserClick={onUser}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /favoris/i }))
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
    fireEvent.click(screen.getByRole('button', { name: /Aide/i }))
    fireEvent.click(screen.getByRole('button', { name: /Profil/i }))
    expect(onBookmark).toHaveBeenCalled()
    expect(onBell).toHaveBeenCalled()
    expect(onInfo).toHaveBeenCalled()
    expect(onUser).toHaveBeenCalled()
  })
})
