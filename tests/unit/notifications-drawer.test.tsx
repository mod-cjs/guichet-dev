import { fireEvent, render, screen } from '@testing-library/react'
import { NotificationsDrawer } from '@/components/features/NotificationsDrawer'
import type { Notification } from '@/components/features/NotificationsDrawer'

const now = Date.now()
const hour = 60 * 60 * 1000
const day = 24 * hour

const FIXTURE: Notification[] = [
  {
    id: 'a',
    type: 'deadline',
    titre: 'Bourse YEAH demain',
    preview: 'Termine ton dossier avant 23h59.',
    timestamp: new Date(now - 1 * hour).toISOString(),
    unread: true,
  },
  {
    id: 'b',
    type: 'candidature',
    titre: 'Candidature reçue',
    preview: 'Ndayane accuse réception.',
    timestamp: new Date(now - 1 * day - 2 * hour).toISOString(),
    unread: false,
  },
  {
    id: 'c',
    type: 'yaye',
    titre: 'Yaye récap',
    preview: '4 candidatures cette semaine.',
    timestamp: new Date(now - 3 * day).toISOString(),
    unread: false,
  },
]

describe('<NotificationsDrawer />', () => {
  it('ne rend rien quand fermé', () => {
    const { container } = render(
      <NotificationsDrawer open={false} onClose={() => undefined} notifications={FIXTURE} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('rend le titre, les onglets et la liste groupée par date', () => {
    render(
      <NotificationsDrawer open onClose={() => undefined} notifications={FIXTURE} />,
    )
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Toutes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Yaye' })).toBeInTheDocument()
    // Sections par date
    expect(screen.getByText("Aujourd'hui")).toBeInTheDocument()
    expect(screen.getByText('Hier')).toBeInTheDocument()
    expect(screen.getByText('Cette semaine')).toBeInTheDocument()
  })

  it('filtre par onglet : Deadlines ne montre que la deadline', () => {
    render(
      <NotificationsDrawer open onClose={() => undefined} notifications={FIXTURE} />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Deadlines' }))
    expect(screen.getByText('Bourse YEAH demain')).toBeInTheDocument()
    expect(screen.queryByText('Candidature reçue')).not.toBeInTheDocument()
    expect(screen.queryByText('Yaye récap')).not.toBeInTheDocument()
  })

  it('empty state quand filtre vide', () => {
    const onlyDeadlines: Notification[] = [FIXTURE[0]]
    render(
      <NotificationsDrawer open onClose={() => undefined} notifications={onlyDeadlines} />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Messages' }))
    expect(screen.getByText(/Pas de nouvelles pour le moment/i)).toBeInTheDocument()
  })

  it('onItemClick appelé au click sur une row', () => {
    const handler = jest.fn()
    render(
      <NotificationsDrawer
        open
        onClose={() => undefined}
        notifications={FIXTURE}
        onItemClick={handler}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Bourse YEAH demain/i }))
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })

  it('bouton "Tout marquer lu" appelle son handler', () => {
    const onMark = jest.fn()
    render(
      <NotificationsDrawer
        open
        onClose={() => undefined}
        notifications={FIXTURE}
        onMarkAllRead={onMark}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Tout marquer lu/i }))
    expect(onMark).toHaveBeenCalled()
  })

  it('bouton fermer appelle onClose', () => {
    const onClose = jest.fn()
    render(
      <NotificationsDrawer open onClose={onClose} notifications={FIXTURE} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onClose).toHaveBeenCalled()
  })
})
