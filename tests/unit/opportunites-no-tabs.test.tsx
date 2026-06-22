/**
 * @jest-environment jsdom
 *
 * Tests GUIC-460 — conformité design v3 Lot 3 Opportunités.
 *
 * Couvre :
 *  F09 — Suppression des tabs horizontales de la page liste
 *  F09 — Le filtrage par type reste fonctionnel via FiltresPanel (URL param)
 *  F24 — Bouton filtres mobile : icône filtre + badge pill count
 *  F14 — CTA détail : label « Postuler maintenant » + icône arrow-right
 *  F25 — Champ recherche : icône search à gauche (prefixIcon)
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mocks Next ────────────────────────────────────────────────────────────────
let currentSearch = ''
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(currentSearch),
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
}))

jest.mock('next/dynamic', () => () => {
  // eslint-disable-next-line react/display-name
  return function DynamicStub() { return null }
})

// Mock Icon pour vérifier son usage (name prop lisible dans le DOM)
jest.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, ...rest }: { name: string; [k: string]: unknown }) => (
    <svg data-testid={`icon-${name}`} aria-hidden {...rest} />
  ),
}))

// Mock composants lourds non testés ici
jest.mock('@/components/opportunites/FiltresPanel', () => ({
  FiltresPanel: ({ onChange }: { onChange: (v: { type?: string }) => void }) => (
    <div data-testid="filtres-panel">
      <button
        type="button"
        onClick={() => onChange({ type: 'Stage' })}
        data-testid="filtres-panel-stage"
      >
        Stage
      </button>
      <button
        type="button"
        onClick={() => onChange({ type: undefined })}
        data-testid="filtres-panel-reset-type"
      >
        Réinitialiser type
      </button>
    </div>
  ),
}))

jest.mock('@/components/opportunites/OpportunitesFiltersSheet', () => ({
  OpportunitesFiltersSheet: () => <div data-testid="filters-sheet" />,
}))

jest.mock('@/components/opportunites/OpportunitesListHeader', () => ({
  OpportunitesListHeader: ({ searchValue, onSearchChange }: { searchValue: string; onSearchChange: (v: string) => void }) => (
    <div data-testid="list-header">
      <input
        data-testid="list-header-search"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="Recherche header"
      />
    </div>
  ),
}))

jest.mock('@/components/opportunites/OppCard', () => ({
  OppCard: ({ item }: { item: { id: string; titre: string } }) => (
    <article data-testid="opp-card">{item.titre}</article>
  ),
}))

jest.mock('@/components/opportunites/YayeMatchCard', () => ({
  YayeMatchCard: () => <div data-testid="yaye-match-card"><span data-testid="yaye-match-score">92%</span></div>,
}))

jest.mock('@/components/opportunites/FavorisProvider', () => ({
  useFavoris: () => ({ has: () => false, toggle: jest.fn() }),
  FavorisProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/lib/regions', () => ({
  regionLabel: (r: string) => r,
}))

// ── Imports sous test ─────────────────────────────────────────────────────────
import React from 'react'
import { OpportunitesClient } from '@/components/opportunites/OpportunitesClient'
import { OpportuniteDetail } from '@/components/opportunites/OpportuniteDetail'
import { FavorisProvider } from '@/components/opportunites/FavorisProvider'
import type { OpportuniteDetail as Detail } from '@/types/candidature'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const ITEMS = [
  { id: 'opp-1', titre: 'Stage Data Science', type: 'Stage', slug: 'stage-data', organisation: 'CJS', region: 'DAKAR', deadline: null, domaine: 'TECH', statut: 'PUBLIE', vues: 0 },
]

function setupFetch(items = ITEMS, total = items.length) {
  global.fetch = jest.fn(async (url: RequestInfo | URL) => {
    const u = url.toString()
    if (u.includes('/api/opportunites')) {
      return { ok: true, json: async () => ({ data: items, meta: { total } }) } as Response
    }
    if (u.includes('/api/favoris/ids')) return { ok: true, json: async () => ({ data: [] }) } as Response
    if (u.includes('/api/candidatures')) return { ok: true, json: async () => ({ data: [] }) } as Response
    return { ok: true, json: async () => ({}) } as Response
  })
}

const baseDetail: Detail = {
  id: 'opp-1',
  slug: 'stage-data-science',
  titre: 'Stage Data Science · 6 mois',
  description: 'Description de test.',
  type: 'STAGE',
  domaine: 'TECH',
  region: 'DAKAR',
  organisation: 'Sonatel',
  remuneration: null,
  deadline: new Date(Date.now() + 10 * 86_400_000).toISOString(),
  lienExterne: null,
  vues: 5,
  statut: 'PUBLIE',
  programme: null,
  typeSlug: 'stage',
  actionLabel: null,
  requiresFileUpload: false,
  fileLabel: null,
  skills: [],
  tags: [],
  details: null,
} as unknown as Detail

const viewer = { prenom: 'Awa', nom: 'Diop', telephone: '+221770000000' }

beforeEach(() => {
  currentSearch = ''
  mockReplace.mockClear()
  setupFetch()
  Object.defineProperty(window, 'navigator', {
    value: { clipboard: { writeText: jest.fn() } },
    writable: true,
  })
})

// ── F09 — Suppression des tabs ─────────────────────────────────────────────
describe('F09 — Tabs supprimées de la page liste', () => {
  it('ne rend PAS de role="tab" dans OpportunitesClient', () => {
    render(<OpportunitesClient initialRegion={null} />)
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('le composant OpportunitesTabs n\'est pas monté dans la liste', () => {
    render(<OpportunitesClient initialRegion={null} />)
    // Toutes / Emplois / Stages / Formations tabs ne doivent pas exister
    expect(screen.queryByRole('tab', { name: /toutes/i })).toBeNull()
    expect(screen.queryByRole('tab', { name: /emplois/i })).toBeNull()
    expect(screen.queryByRole('tab', { name: /stages/i })).toBeNull()
  })

  it('le filtrage par type via FiltresPanel modifie l\'URL (pas de tabs)', async () => {
    render(<OpportunitesClient initialRegion={null} />)
    // Le FiltresPanel est disponible immédiatement (pas de dépendance au fetch)
    const filtreStageBtn = screen.getByTestId('filtres-panel-stage')
    await userEvent.click(filtreStageBtn)
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('type=Stage'),
      expect.anything(),
    )
  }, 15000)

  it('reset du type via FiltresPanel retire le param type de l\'URL', async () => {
    currentSearch = 'type=Stage'
    render(<OpportunitesClient initialRegion={null} />)
    const resetBtn = screen.getByTestId('filtres-panel-reset-type')
    await userEvent.click(resetBtn)
    // L'URL ne doit plus contenir type=
    expect(mockReplace).toHaveBeenCalledWith(
      expect.not.stringContaining('type='),
      expect.anything(),
    )
  }, 15000)
})

// ── F24 — Bouton filtres mobile : icône + badge ──────────────────────────────
describe('F24 — Bouton filtres mobile : icône filter + badge pill', () => {
  it('affiche l\'icône filter dans le bouton filtres mobile', () => {
    render(<OpportunitesClient initialRegion={null} />)
    // L'icône filter doit être présente dans le bouton filtres mobile
    expect(screen.getByTestId('icon-filter')).toBeInTheDocument()
  })

  it('affiche un badge pill avec le count actif quand des filtres sont actifs', () => {
    currentSearch = 'type=Stage&region=DAKAR'
    render(<OpportunitesClient initialRegion={null} />)
    // 2 filtres actifs (type + region) → badge avec "2"
    const badge = screen.getByTestId('filters-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('2')
  })

  it('masque le badge quand aucun filtre actif', () => {
    currentSearch = ''
    render(<OpportunitesClient initialRegion={null} />)
    expect(screen.queryByTestId('filters-badge')).toBeNull()
  })
})

// ── F25 — Icône recherche dans le champ search mobile ───────────────────────
describe('F25 — Icône search dans le champ de recherche', () => {
  it('le champ recherche mobile a une icône search à gauche (prefixIcon)', () => {
    render(<OpportunitesClient initialRegion={null} />)
    // L'Input avec prefixIcon="search" doit rendre un icon-search
    expect(screen.getByTestId('icon-search')).toBeInTheDocument()
  })
})

// ── F14 — CTA « Postuler maintenant » + icône arrow-right ──────────────────
describe('F14 — CTA détail : « Postuler maintenant » + icône arrow-right', () => {
  function renderDetail(detail: Detail = baseDetail) {
    return render(
      <FavorisProvider isAuthenticated>
        <OpportuniteDetail detail={detail} viewer={viewer} />
      </FavorisProvider>,
    )
  }

  it('CTA affiche le label « Postuler maintenant » par défaut (actionLabel null)', async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /postuler maintenant/i })).toBeInTheDocument()
    })
  })

  it('CTA actif affiche l\'icône arrow-right', async () => {
    renderDetail()
    await waitFor(() => {
      // L'icône arrow-right doit être visible dans le CTA actif
      expect(screen.getByTestId('icon-arrow-right')).toBeInTheDocument()
    })
  })

  it('icône arrow-right absente quand CTA disabled (deadline expirée)', () => {
    const expired: Detail = {
      ...baseDetail,
      deadline: new Date(Date.now() - 86_400_000).toISOString(),
    }
    renderDetail(expired)
    const cta = screen.getByRole('button', { name: /candidatures closes/i })
    expect(cta).toBeDisabled()
    // Le bouton disabled ne doit pas afficher arrow-right
    expect(screen.queryByTestId('icon-arrow-right')).toBeNull()
  })
})
