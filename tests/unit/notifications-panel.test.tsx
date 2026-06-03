import { fireEvent, render, screen } from '@testing-library/react'
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel'
import { MOCK_NOTIFICATIONS } from '@/components/notifications/mock-data'

describe('<NotificationsPanel />', () => {
  it('ne rend rien quand fermé', () => {
    const { container } = render(
      <NotificationsPanel isOpen={false} onClose={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('rend un dialog ARIA quand ouvert', () => {
    render(<NotificationsPanel isOpen onClose={() => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('affiche les 4 onglets filtre', () => {
    render(<NotificationsPanel isOpen onClose={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Toutes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Non lues' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Candidatures' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Système' })).toBeInTheDocument()
  })

  it('appelle onClose au clic sur la croix', () => {
    const onClose = jest.fn()
    render(<NotificationsPanel isOpen onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Fermer les notifications'))
    expect(onClose).toHaveBeenCalled()
  })

  it('appelle onClose sur Escape', () => {
    const onClose = jest.fn()
    render(<NotificationsPanel isOpen onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('affiche les notifications du mock par défaut', () => {
    render(<NotificationsPanel isOpen onClose={() => {}} />)
    expect(screen.getByText('Candidature retenue')).toBeInTheDocument()
  })

  it('filtre les notifications non lues', () => {
    render(<NotificationsPanel isOpen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Non lues' }))
    // Les items lus ne doivent plus être visibles : "Rappel rendez-vous" est read
    expect(screen.queryByText('Rappel rendez-vous')).not.toBeInTheDocument()
  })

  it('appelle onMarkRead au clic sur une notification', () => {
    const onMarkRead = jest.fn()
    render(<NotificationsPanel isOpen onClose={() => {}} onMarkRead={onMarkRead} />)
    fireEvent.click(screen.getByText('Candidature retenue'))
    expect(onMarkRead).toHaveBeenCalledWith(MOCK_NOTIFICATIONS[0].id)
  })
})
