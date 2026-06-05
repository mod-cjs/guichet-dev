import { render, screen } from '@testing-library/react'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}))

const mockLoadDashboardCounts = jest.fn()
jest.mock('@/lib/dashboard-loader', () => ({
  loadDashboardCounts: (...args: unknown[]) => mockLoadDashboardCounts(...args),
}))

const mockLoadDashboardData = jest.fn()
jest.mock('@/lib/loaders/dashboard', () => ({
  loadDashboardData: (...args: unknown[]) => mockLoadDashboardData(...args),
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

describe('Tableau de bord — page intégration (v2, données réelles)', () => {
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
    mockLoadDashboardData.mockResolvedValue({
      recoOpps: [
        {
          id:    'opp-1',
          tag:   'Bourse · J-3',
          tone:  'urgent',
          title: 'Bourse agricole',
          org:   'ANIDA · Tambacounda',
          meta:  [],
          href:  '/opportunites/bourse-agricole',
          ctaLabel: 'Voir détails',
        },
      ],
      events: [
        { id: 'ev-1', day: 22, month: 'Mai', title: 'Atelier CV', subtitle: 'CJS Tamba', href: '/agenda/ev-1' },
      ],
      centres: [
        { id: 'c-1', name: 'CJS Dakar', address: 'Plateau', distance: 'Dakar', href: '/centres/c-1' },
      ],
      tracker: [
        {
          id: 'cand-1',
          title: 'Stage Data',
          subtitle: 'Déposée le 14 mai',
          icon: 'document',
          tone: 'yellow',
          currentStep: 1,
          stepLabel: 'Revue conseiller',
          cta: { label: 'Détails', href: '/jeune/mes-candidatures/cand-1', variant: 'ghost' },
        },
      ],
    })
  })

  it('redirige vers /auth/connexion si pas de session', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    await expect(TableauDeBordPage()).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/auth/connexion')
  })

  it('appelle loadDashboardData avec le cjsUid de session', async () => {
    await renderPage()
    expect(mockLoadDashboardData).toHaveBeenCalledWith('uid-1')
  })

  it('rend le hero v2 avec le prénom de la session', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Awa/i)
  })

  it('rend les 4 KPI v2 avec compteurs réels (favoris=12)', async () => {
    await renderPage()
    expect(screen.getByRole('region', { name: /Indicateurs clés/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Candidatures en cours/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Opps recommandées/i)).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText(/Sauvegardées/i)).toBeInTheDocument()
    expect(screen.getByText(/Profil complété/i)).toBeInTheDocument()
  })

  it('utilise le completionScore retourné par Prisma', async () => {
    await renderPage()
    expect(screen.getByText('72 %')).toBeInTheDocument()
  })

  it('rend les vraies données (reco opp + event + centre + candidature)', async () => {
    await renderPage()
    expect(screen.getByText(/Bourse agricole/i)).toBeInTheDocument()
    expect(screen.getByText(/Atelier CV/i)).toBeInTheDocument()
    expect(screen.getByText('CJS Dakar')).toBeInTheDocument()
    expect(screen.getByText('Stage Data')).toBeInTheDocument()
  })

  it('rend les empty-states quand les loaders renvoient des listes vides', async () => {
    mockLoadDashboardData.mockResolvedValueOnce({
      recoOpps: [], events: [], centres: [], tracker: [],
    })
    await renderPage()
    expect(screen.getByText(/Aucune opportunité à recommander/i)).toBeInTheDocument()
    expect(screen.getByText(/Aucune candidature en cours/i)).toBeInTheDocument()
    expect(screen.getByText(/Aucun événement/i)).toBeInTheDocument()
    expect(screen.getByText(/Aucun centre/i)).toBeInTheDocument()
  })
})
