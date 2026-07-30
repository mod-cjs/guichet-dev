/** @jest-environment jsdom */
/**
 * Tests des correctifs W2 GUIC-358 sur `<CentresAllClient>`.
 *
 * Couvre :
 *  - Hero MyCJSCard desktop si connecté + badge "Ouvrir ma carte"
 *  - Duo CTAs mobile (Mes réservations + Ressources / Connectez-vous)
 *  - Légende carte si user.centrePrincipal présent
 *  - Sous-titre se termine par "."
 */

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
}))

jest.mock('@/components/centres', () => {
  const actual = jest.requireActual('@/components/centres')
  return {
    ...actual,
    CentresMapGoogle: () => <div data-testid="centres-map-google-stub" />,
    MyCJSCard: ({ compact }: { compact?: boolean }) => (
      <div data-testid={compact ? 'my-cjs-card-compact' : 'my-cjs-card-hero'} />
    ),
  }
})

import { render, screen } from '@testing-library/react'
import { CentresAllClient, type CentresAllCentre } from '@/app/(public)/centres/centres-all-client'

const baseCentre: CentresAllCentre = {
  id: 'c1',
  slug: 'cjs-dakar',
  nom: 'CJS Dakar',
  region: 'Dakar',
  ville: 'Dakar',
  services: ['Wifi'],
  conseillersCount: 2,
  estActif: true,
  horaires: [],
  latitude: 14.7,
  longitude: -17.4,
  isOpen: true,
}

const user = {
  cjsUid: 'cjs-uid-demo-aissa-diop',
  prenom: 'Aïssa',
  nom: 'Diop',
  matricule: 'GJS · AD · ABC123',
  membreDepuis: '03/2025',
  centrePrincipal: { nom: 'CJS Dakar', region: 'Dakar' },
  photoUrl: null,
}

describe('<CentresAllClient /> — fixes W2', () => {
  it('sous-titre se termine par un point', () => {
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userIsConnected={false}
      />,
    )
    expect(
      screen.getByText(/trouve le plus proche de toi\./i),
    ).toBeInTheDocument()
  })

  it('rend le hero MyCJSCard (desktop) si user connecté', () => {
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userCentrePrincipalId="c1"
        userIsConnected={true}
        user={user}
      />,
    )
    expect(screen.getByTestId('my-cjs-card-hero')).toBeInTheDocument()
    expect(screen.getByText(/Ouvrir ma carte/i)).toBeInTheDocument()
  })

  it('ne rend PAS le hero MyCJSCard si user déconnecté', () => {
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userIsConnected={false}
      />,
    )
    expect(screen.queryByTestId('my-cjs-card-hero')).not.toBeInTheDocument()
    expect(screen.queryByTestId('my-cjs-card-compact')).not.toBeInTheDocument()
  })

  it('duo CTAs mobile : Mes réservations + Ressources si connecté', () => {
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userCentrePrincipalId="c1"
        userIsConnected={true}
        user={user}
      />,
    )
    expect(screen.getAllByRole('link', { name: /Mes réservations/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Ressources/i }).length).toBeGreaterThan(0)
  })

  it('duo CTAs mobile : Ressources + Connectez-vous si déconnecté', () => {
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userIsConnected={false}
      />,
    )
    expect(screen.getAllByRole('link', { name: /Ressources/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Connectez-vous/i })).toBeInTheDocument()
  })

  it('légende affichée si user a un centre principal', () => {
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userCentrePrincipalId="c1"
        userIsConnected={true}
        user={user}
      />,
    )
    expect(screen.getAllByLabelText(/Légende de la carte/i).length).toBeGreaterThan(0)
  })

  it('CTAs header "Mes réservations" + "Ma carte CJS" sont masqués mobile (hidden lg:flex)', () => {
    const { container } = render(
      <CentresAllClient
        centres={[baseCentre]}
        userCentrePrincipalId="c1"
        userIsConnected={true}
        user={user}
      />,
    )
    // Repère le wrapper du duo CTAs desktop : un seul élément a `Ma carte CJS`
    const link = container.querySelector('a[href="/jeune/ma-carte"]')
    expect(link).not.toBeNull()
    const wrapper = link?.parentElement
    expect(wrapper?.className).toMatch(/hidden/)
    expect(wrapper?.className).toMatch(/lg:flex/)
  })

  it('légende affichée même sans centre principal (dès qu’il y a des centres)', () => {
    // La légende ne dépend plus du centre principal : elle est rendue dès que
    // `centres.length > 0` (blocs carte desktop + mobile).
    render(
      <CentresAllClient
        centres={[baseCentre]}
        userIsConnected={true}
        user={{ ...user, centrePrincipal: null }}
      />,
    )
    expect(screen.getAllByLabelText(/Légende de la carte/i).length).toBeGreaterThan(0)
  })

  it('légende NON affichée si aucun centre', () => {
    render(
      <CentresAllClient
        centres={[]}
        userIsConnected={true}
        user={{ ...user, centrePrincipal: null }}
      />,
    )
    expect(screen.queryByLabelText(/Légende de la carte/i)).not.toBeInTheDocument()
  })

  // ──────────────── GUIC-689 — hygiène tokens design v5 ────────────────

  it('GUIC-689 — h1 "Centres CJS" en text-fs-800 (aligné agenda/ressources)', () => {
    render(<CentresAllClient centres={[baseCentre]} userIsConnected={false} />)
    const h1 = screen.getByRole('heading', { level: 1, name: /Centres CJS/i })
    expect(h1.className).toMatch(/text-fs-800/)
    expect(h1.className).not.toMatch(/text-fs-500/)
  })

  // Note : la vérification précise border/couleur du bouton desktop "Mes
  // réservations" (var(--gj-line)/var(--gj-ink)) est couverte par sentinelle
  // fs dans tests/unit/design-v5-tokens-hygiene.test.ts — jsdom (cssstyle)
  // ne sait pas sérialiser un style inline utilisant var() (cf. investigation
  // GUIC-689 : `el.style.color = 'var(--x)'` est silencieusement ignoré).
})
