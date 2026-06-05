import { render, screen } from '@testing-library/react'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}))

const mockLoadDashboardCounts = jest.fn()
jest.mock('@/lib/dashboard-loader', () => ({
  loadDashboardCounts: (...args: unknown[]) => mockLoadDashboardCounts(...args),
}))

const mockProfilFindUnique = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune: {
      findUnique: (...args: unknown[]) => mockProfilFindUnique(...args),
    },
  },
}))

const mockRedirect = jest.fn((_url: string) => {
  throw new Error('REDIRECT')
})
jest.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}))

import TableauDeBordPage from '@/app/jeune/(app)/tableau-de-bord/page'

async function renderPage() {
  const ui = await TableauDeBordPage()
  return render(ui)
}

describe('Tableau de bord — page intégration (v2)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      cjsUid: 'uid-1',
      prenom: 'Awa',
      nom:    'Diop',
    })
    mockLoadDashboardCounts.mockResolvedValue({
      candidatures:   3,
      eventsInscrits: 2,
      favoris:        12,
      certificats:    1,
      experiences:    2,
      diplomes:       1,
    })
    mockProfilFindUnique.mockResolvedValue({ completionScore: 72 })
  })

  it('redirige vers /auth/connexion si pas de session', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    await expect(TableauDeBordPage()).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/auth/connexion')
  })

  it('rend le hero v2 avec le prénom de la session', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Awa/i)
  })

  it('rend les 4 KPI v2', async () => {
    await renderPage()
    expect(screen.getByRole('region', { name: /Indicateurs clés/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Candidatures en cours/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Opps recommandées/i)).toBeInTheDocument()
    expect(screen.getByText(/Sauvegardées/i)).toBeInTheDocument()
    expect(screen.getByText(/Profil complété/i)).toBeInTheDocument()
  })

  it('utilise le completionScore retourné par Prisma', async () => {
    await renderPage()
    expect(screen.getByText('72 %')).toBeInTheDocument()
  })

  it('rend le tracker, les centres, les events, le nudge profil et le panel Yaye', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: /Mes candidatures en cours/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Centres CJS près de toi/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Événements à venir/i })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /Complétude du profil/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ouvrir le chat Yaye/i })).toBeInTheDocument()
  })

  it('rend le carousel de recommandations', async () => {
    await renderPage()
    expect(screen.getByRole('region', { name: /À ne pas rater/i })).toBeInTheDocument()
  })
})
