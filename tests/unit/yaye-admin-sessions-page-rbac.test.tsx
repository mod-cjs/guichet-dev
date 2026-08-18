/**
 * Panel admin — page /admin/yaye/sessions (GUIC-259, R-1).
 *
 * La garde d'accès doit s'aligner sur canManageYaye (admin/directeur/conseiller/
 * moderator/super_admin selon la règle métier), pas sur un strict `roles.includes('admin')`.
 * Un rôle autorisé par canManageYaye mais pas 'admin' strict ne doit PAS être redirigé.
 */

const getSessionMock = jest.fn()
const listSessionsMock = jest.fn()
const sessionsSummaryMock = jest.fn()
const centreFindManyMock = jest.fn()
const agentLogFindManyMock = jest.fn()
const redirectMock = jest.fn((..._args: unknown[]) => {
  throw new Error('NEXT_REDIRECT')
})

jest.mock('@/lib/auth', () => ({
  getSession: (...args: unknown[]) => getSessionMock(...args),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    centre: { findMany: (...args: unknown[]) => centreFindManyMock(...args) },
    agentLog: { findMany: (...args: unknown[]) => agentLogFindManyMock(...args) },
  },
}))

jest.mock('@/lib/ia/admin/sessions', () => ({
  listSessions: (...args: unknown[]) => listSessionsMock(...args),
  sessionsSummary: (...args: unknown[]) => sessionsSummaryMock(...args),
}))

jest.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}))

jest.mock('@/app/admin/yaye/sessions/SessionsClient', () => ({
  SessionsClient: () => null,
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SessionsPage = require('@/app/admin/yaye/sessions/page').default

describe('/admin/yaye/sessions — RBAC (R-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    centreFindManyMock.mockResolvedValue([])
    agentLogFindManyMock.mockResolvedValue([])
    listSessionsMock.mockResolvedValue({ rows: [], total: 0 })
    sessionsSummaryMock.mockResolvedValue({ sessions: 0, escalades: 0, erreurs: 0 })
  })

  it('redirige si aucune session', async () => {
    getSessionMock.mockResolvedValue(null)
    await expect(SessionsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/auth/connexion')
  })

  it("redirige un rôle non autorisé par canManageYaye (ex. bénéficiaire)", async () => {
    getSessionMock.mockResolvedValue({ roles: ['beneficiaire'] })
    await expect(SessionsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/auth/connexion')
  })

  it("n'est PAS redirigé pour un rôle autorisé par canManageYaye mais pas 'admin' strict (conseiller)", async () => {
    getSessionMock.mockResolvedValue({ roles: ['conseiller'] })
    await expect(SessionsPage({ searchParams: Promise.resolve({}) })).resolves.toBeTruthy()
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it("n'est pas redirigé pour 'directeur'", async () => {
    getSessionMock.mockResolvedValue({ roles: ['directeur'] })
    await expect(SessionsPage({ searchParams: Promise.resolve({}) })).resolves.toBeTruthy()
    expect(redirectMock).not.toHaveBeenCalled()
  })
})
