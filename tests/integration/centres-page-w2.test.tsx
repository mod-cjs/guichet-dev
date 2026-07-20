/**
 * Tests d'intégration `/centres` (Lot 7 W2 / GUIC-353).
 *
 * Vérifie header anonyme vs connecté + rendu du `CentresAllClient` + filtres.
 * Loader Prisma + getSession mockés.
 */

// qrcode est une dépendance optionnelle (peer); en jest on stub.
jest.mock(
  'qrcode',
  () => ({
    __esModule: true,
    default: {
      toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,AA'),
    },
  }),
  // GUIC-617 — pas de `{ virtual: true }` : `qrcode` est installé, et `virtual` sur un module
  // réel empoisonne le résolveur des fichiers suivants (cf. ma-carte-page.test.tsx).
)

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}))

const mockGetCentres = jest.fn()
jest.mock('@/lib/loaders/centres', () => ({
  getCentresWithStatusAndHoraires: (...a: unknown[]) => mockGetCentres(...a),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}))

// useRouter App Router — mock requis pour CentresAllClient
jest.mock('next/navigation', () => ({
  useRouter:       () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname:     () => '/centres',
}))

// CentresMapGoogle utilise des hooks/lib externes — on stub.
jest.mock('@/components/centres', () => {
  const actual = jest.requireActual('@/components/centres')
  return {
    ...actual,
    CentresMapGoogle: () => <div data-testid="centres-map-google-stub" />,
    MyCJSCard: () => <div data-testid="my-cjs-card-stub" />,
  }
})

import { render, screen } from '@testing-library/react'
import Page from '@/app/(public)/centres/page'
import { getSession } from '@/lib/auth'

const baseCentre = {
  id: 'c1',
  slug: 'cjs-dakar',
  nom: 'CJS Dakar',
  region: 'Dakar',
  ville: 'Dakar',
  adresse: '...',
  latitude: 14.7,
  longitude: -17.4,
  services: ['Wifi'],
  conseillersCount: 2,
  estActif: true,
  horaires: [],
  isOpen: true,
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('/centres — W2 vue all', () => {
  it('affiche un EmptyState quand aucun centre', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    mockGetCentres.mockResolvedValue([])
    render(await Page())
    expect(screen.getByText(/Aucun centre disponible/i)).toBeInTheDocument()
  })

  it('header anonyme : "Centres CJS" + sous-titre + pas de CTAs jeune', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    mockGetCentres.mockResolvedValue([baseCentre])
    render(await Page())
    expect(screen.getByRole('heading', { name: /Centres CJS/i })).toBeInTheDocument()
    expect(screen.getByText(/1 centres dans tout le Sénégal/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Mes réservations/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ma carte CJS/i })).not.toBeInTheDocument()
  })

  it('header connecté : ajoute CTAs Mes réservations + Ma carte CJS', async () => {
    ;(getSession as jest.Mock).mockResolvedValue({
      cjsUid: 'abc123def456',
      prenom: 'Aïssa',
      nom: 'Diop',
      region: 'Dakar',
    })
    mockGetCentres.mockResolvedValue([baseCentre])
    render(await Page())
    expect(screen.getAllByRole('link', { name: /Mes réservations/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Ma carte CJS/i }).length).toBeGreaterThan(0)
  })

  it('rend le filtre par région + l\'annuaire desktop', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    mockGetCentres.mockResolvedValue([
      baseCentre,
      { ...baseCentre, id: 'c2', nom: 'CJS Thies', region: 'Thies', slug: 'cjs-thies' },
    ])
    render(await Page())
    expect(screen.getAllByRole('radiogroup').length).toBeGreaterThan(0)
    // CentreRow / CentreCardMobile -> role=button avec aria-label
    const items = screen.getAllByRole('button', { name: /Voir le centre/i })
    expect(items.length).toBeGreaterThanOrEqual(2)
  })

  it('utilise role="main" sur le container principal', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    mockGetCentres.mockResolvedValue([baseCentre])
    render(await Page())
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  // ──────────────── GUIC-398 / Wave 7 ────────────────

  it('GUIC-398 — légende de la carte toujours visible (anonyme inclus)', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    mockGetCentres.mockResolvedValue([baseCentre])
    render(await Page())
    const legends = screen.getAllByLabelText(/Légende de la carte/i)
    expect(legends.length).toBeGreaterThan(0)
  })

  it('GUIC-398 — header "N centres" uppercase mobile', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    mockGetCentres.mockResolvedValue([baseCentre])
    render(await Page())
    const header = screen.getByTestId('centres-count-header')
    expect(header).toBeInTheDocument()
    expect(header).toHaveTextContent(/1 centres/i)
  })

  it('GUIC-398 — visiteur non connecté voit un CTA "Se connecter pour avoir ta carte"', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    mockGetCentres.mockResolvedValue([baseCentre])
    render(await Page())
    const cta = screen.getAllByLabelText(/Se connecter pour obtenir ta carte CJS/i)
    expect(cta.length).toBeGreaterThan(0)
  })
})
