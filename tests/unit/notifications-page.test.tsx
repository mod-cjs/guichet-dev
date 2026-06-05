import { render } from '@testing-library/react'

/**
 * GUIC-233 — page /jeune/notifications.
 * - Redirige vers /auth/connexion si aucune session SSO.
 * - Affiche un EmptyState stub tant que le modèle Notification n'existe pas (M11).
 */

const getSessionMock = jest.fn()
const redirectMock = jest.fn((..._args: unknown[]) => {
  throw new Error('NEXT_REDIRECT')
})

jest.mock('@/lib/auth', () => ({
  getSession: (...args: unknown[]) => getSessionMock(...args),
}))

jest.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}))

// Import après les mocks (require dynamique pour respecter l'ordre)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NotificationsPage = require('@/app/jeune/(app)/notifications/page').default

describe('/jeune/notifications', () => {
  beforeEach(() => {
    getSessionMock.mockReset()
    redirectMock.mockClear()
  })

  it('redirige vers /auth/connexion si aucune session', async () => {
    getSessionMock.mockResolvedValue(null)
    await expect(NotificationsPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/auth/connexion')
  })

  it('affiche le titre et un EmptyState pour un user authentifié', async () => {
    getSessionMock.mockResolvedValue({ cjsUid: 'user-1', email: 'a@b.c' })
    const element = await NotificationsPage()
    const { getByRole, getByText } = render(element)
    expect(getByRole('heading', { level: 1 }).textContent).toMatch(/Notifications/)
    expect(getByText(/Aucune notification/i)).toBeInTheDocument()
  })
})
