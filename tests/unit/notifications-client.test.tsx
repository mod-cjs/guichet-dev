import { render, screen, fireEvent, act } from '@testing-library/react'
import { NotificationsClient } from '@/components/jeune/NotificationsClient'
import type { NotificationsGroupedByDay } from '@/lib/loaders/notifications'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

beforeEach(() => {
  pushMock.mockReset()
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
})

const GROUPES: NotificationsGroupedByDay[] = [
  {
    jour: "Aujourd'hui",
    items: [
      {
        id: 'n1',
        type: 'Deadline',
        titre: 'Bourse agri',
        contenu: 'Dossier 60 %',
        iconName: 'flame',
        lien: '/jeune/opportunites',
        metaPill: 'J-3',
        lu: false,
        createdAt: '2026-06-05T11:48:00Z',
        ageRelatif: 'il y a 12 min',
      },
      {
        id: 'n2',
        type: 'Candidature',
        titre: 'Stage Sonatel',
        contenu: 'Reçue',
        iconName: 'document',
        lien: null,
        metaPill: 'CANDIDATURE',
        lu: false,
        createdAt: '2026-06-05T10:00:00Z',
        ageRelatif: 'il y a 2 h',
      },
    ],
  },
  {
    jour: 'Hier',
    items: [
      {
        id: 'n3',
        type: 'Message',
        titre: 'Mariama',
        contenu: 'Vendredi 10h',
        iconName: 'chat',
        lien: null,
        metaPill: 'MESSAGE',
        lu: true,
        createdAt: '2026-06-04T16:02:00Z',
        ageRelatif: 'hier · 16:02',
      },
    ],
  },
]

describe('NotificationsClient', () => {
  it('rend les groupes et items reçus', () => {
    render(<NotificationsClient groupes={GROUPES} initialUnread={2} />)
    expect(screen.getByText('Bourse agri')).toBeInTheDocument()
    expect(screen.getByText('Stage Sonatel')).toBeInTheDocument()
    expect(screen.getByText('Mariama')).toBeInTheDocument()
    expect(screen.getByText(/2 non lues/)).toBeInTheDocument()
  })

  it('filtre par onglet : seules les notifs du type sélectionné restent', () => {
    render(<NotificationsClient groupes={GROUPES} initialUnread={2} />)
    fireEvent.click(screen.getByRole('tab', { name: /Deadlines/ }))
    expect(screen.getByText('Bourse agri')).toBeInTheDocument()
    expect(screen.queryByText('Stage Sonatel')).not.toBeInTheDocument()
    expect(screen.queryByText('Mariama')).not.toBeInTheDocument()
  })

  it('« Tout marquer lu » appelle l\'API et passe unread à 0', async () => {
    render(<NotificationsClient groupes={GROUPES} initialUnread={2} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Tout marquer/ }))
    })
    expect(global.fetch).toHaveBeenCalledWith('/api/notifications/lu-all', {
      method: 'POST',
    })
    expect(screen.getByText(/Tout est à jour/)).toBeInTheDocument()
  })

  it('clic sur un item non-lu : POST lu + redirect vers le lien', async () => {
    render(<NotificationsClient groupes={GROUPES} initialUnread={2} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Bourse agri.*non lue/ }))
    })
    expect(global.fetch).toHaveBeenCalledWith('/api/notifications/n1/lu', {
      method: 'POST',
    })
    expect(pushMock).toHaveBeenCalledWith('/jeune/opportunites')
  })

  it('affiche EmptyState quand aucun groupe ne reste après filtre', () => {
    render(<NotificationsClient groupes={GROUPES} initialUnread={2} />)
    fireEvent.click(screen.getByRole('tab', { name: /Yaye/ }))
    expect(
      screen.getByRole('heading', { name: /Aucune notification/ }),
    ).toBeInTheDocument()
  })
})
