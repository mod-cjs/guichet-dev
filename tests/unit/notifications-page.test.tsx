import { render } from '@testing-library/react'

/**
 * GUIC-247 — page /jeune/notifications (version complète).
 * - Redirige vers /auth/connexion si aucune session SSO.
 * - Charge les notifications via loadNotifications + rend NotificationsClient.
 */

const getSessionMock = jest.fn()
const loadNotificationsMock = jest.fn()
const redirectMock = jest.fn((..._args: unknown[]) => {
  throw new Error('NEXT_REDIRECT')
})

jest.mock('@/lib/auth', () => ({
  getSession: (...args: unknown[]) => getSessionMock(...args),
}))

jest.mock('@/lib/loaders/notifications', () => ({
  loadNotifications: (...args: unknown[]) => loadNotificationsMock(...args),
}))

jest.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
  useRouter: () => ({ push: jest.fn() }),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NotificationsPage = require('@/app/jeune/(app)/notifications/page').default

describe('/jeune/notifications', () => {
  beforeEach(() => {
    getSessionMock.mockReset()
    loadNotificationsMock.mockReset()
    redirectMock.mockClear()
  })

  it('redirige vers /auth/connexion si aucune session', async () => {
    getSessionMock.mockResolvedValue(null)
    await expect(NotificationsPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/auth/connexion')
  })

  it('rend le titre et le client avec les groupes chargés', async () => {
    getSessionMock.mockResolvedValue({ cjsUid: 'user-1' })
    loadNotificationsMock.mockResolvedValue({
      groupes: [
        {
          jour: "Aujourd'hui",
          items: [
            {
              id: 'n1',
              type: 'Deadline',
              titre: 'Bourse agri',
              contenu: 'J-3',
              iconName: 'flame',
              lien: null,
              metaPill: 'J-3',
              lu: false,
              createdAt: new Date().toISOString(),
              ageRelatif: 'il y a 12 min',
            },
          ],
        },
      ],
      unreadCount: 1,
    })
    const element = await NotificationsPage()
    const { getByRole, getByText } = render(element)
    expect(getByRole('heading', { level: 1 }).textContent).toMatch(/Notifications/)
    expect(getByText('Bourse agri')).toBeInTheDocument()
    expect(loadNotificationsMock).toHaveBeenCalledWith('user-1')
  })
})
