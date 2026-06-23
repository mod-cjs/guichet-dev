/**
 * Tests d'intégration `/centres/[slug]` (Lot 7 W3 / GUIC-357).
 *
 * Loader Prisma + getSession + next/navigation mockés.
 */

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}))

const mockGetCentreBySlug = jest.fn()
jest.mock('@/lib/loaders/centres', () => ({
  getCentreBySlug: (...a: unknown[]) => mockGetCentreBySlug(...a),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}))

const mockNotFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
jest.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/centres/cjs-tambacounda',
}))

// Stubs lourds — la mini-map utilise useId() côté client, OK en jsdom mais on
// neutralise SenegalMap pour éviter toute injection <style> superflue dans le DOM.
jest.mock('@/components/centres/SenegalMap', () => ({
  SenegalMap: () => null,
}))
jest.mock('@/components/centres/SenegalMap/index', () => ({
  SenegalMap: () => null,
}))

import { render, screen } from '@testing-library/react'
import Page from '@/app/(public)/centres/[slug]/page'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const baseCentre = {
  id: 'c-tamba',
  slug: 'cjs-tambacounda',
  nom: 'CJS Tambacounda',
  region: 'Tambacounda',
  ville: 'Tambacounda',
  adresse: 'Quartier Plateau',
  telephone: '+221339812020',
  email: 'tambacounda@cjs.sn',
  description: null,
  imageUrl: null,
  latitude: 13.77,
  longitude: -13.66,
  services: ['WiFi', 'Coworking'],
  conseillersCount: 3,
  // GUIC-393 (W3) : centre-detail-client rend <CentreEquipeSection agents={centre.agents} />
  // et <CentreEvenementsSection evenements={centre.evenementsAVenir} />. Sans ces champs,
  // les composants lisent `.length` sur undefined.
  agents: [],
  evenementsAVenir: [],
  isOpen: true,
  openingHoursText: '08:00 - 18:00',
  horaires: [
    { jour: 'Lundi', ouvert: true, ouvreA: '08:00', fermeA: '18:00' },
  ],
  ressources: [
    {
      id: 'r1',
      type: 'Salle',
      nom: 'Salle A',
      capacite: 8,
      capaciteUnit: 'personnes',
      estActive: true,
    },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('/centres/[slug] — W3 vue detail', () => {
  it('rend le hero + sections quand le centre existe', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    mockGetCentreBySlug.mockResolvedValue(baseCentre)
    render(
      await Page({
        params: Promise.resolve({ slug: 'cjs-tambacounda' }),
      }),
    )
    expect(
      screen.getAllByRole('heading', { level: 1, name: /CJS Tambacounda/i }).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(/Quartier Plateau/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Horaires/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Services sur place/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Contact/i).length).toBeGreaterThan(0)
  })

  it('appelle notFound() si centre introuvable', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    mockGetCentreBySlug.mockResolvedValue(null)
    await expect(
      Page({ params: Promise.resolve({ slug: 'inconnu' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('affiche l’eyebrow "Mon centre" si user.centrePrincipalId === centre.id', async () => {
    ;(getSession as jest.Mock).mockResolvedValue({
      cjsUid: 'u1',
      prenom: 'A',
      nom: 'B',
    })
    ;(
      prisma.profilJeune.findUnique as jest.Mock
    ).mockResolvedValue({ centrePrincipalId: 'c-tamba' })
    mockGetCentreBySlug.mockResolvedValue(baseCentre)
    render(
      await Page({
        params: Promise.resolve({ slug: 'cjs-tambacounda' }),
      }),
    )
    expect(screen.getAllByText(/Mon centre · Tambacounda/i).length).toBeGreaterThan(
      0,
    )
  })

  it('rend les ressources teaser quand présentes', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    mockGetCentreBySlug.mockResolvedValue(baseCentre)
    render(
      await Page({
        params: Promise.resolve({ slug: 'cjs-tambacounda' }),
      }),
    )
    expect(screen.getAllByText('Salle A').length).toBeGreaterThan(0)
    const reserveLinks = screen.getAllByRole('link', { name: /Réserver Salle A/i })
    expect(reserveLinks[0]).toHaveAttribute(
      'href',
      '/centres/cjs-tambacounda/ressources/r1/reserver',
    )
  })

  it('rend "Tout voir →" qui mène à la liste W4', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    mockGetCentreBySlug.mockResolvedValue(baseCentre)
    render(
      await Page({
        params: Promise.resolve({ slug: 'cjs-tambacounda' }),
      }),
    )
    const links = screen.getAllByRole('link', { name: /Tout voir/i })
    expect(links[0]).toHaveAttribute(
      'href',
      '/centres/cjs-tambacounda/ressources',
    )
  })
})
