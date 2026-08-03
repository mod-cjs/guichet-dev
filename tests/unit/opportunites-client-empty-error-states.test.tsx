/**
 * @jest-environment jsdom
 *
 * GUIC-689 (Lot P3-A) — États vide/erreur enrichis de la liste opportunités.
 *
 * Réf design v5 : `design-guichet-v5/lot3-opps-web.jsx#WebEmptyState`
 * (L.760-810) et `lot3-opps-mobile.jsx#MobileEmptyState` (L.653-696).
 *
 * Couvre :
 *  - état vide : action "Élargir la région" réelle (retire `region` de
 *    l'URL), n'apparaît QUE si un filtre région est actif
 *  - bandeau Yaye sous l'état vide, ouvre le panneau existant (useYayePanel)
 *  - état d'erreur : illustration dédiée `EmptyState illustration="error"`
 *    au lieu de la <div> rouge artisanale, action "Réessayer" inchangée
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mocks Next ──────────────────────────────────────────────────────────────
let currentSearch = ''
const mockReplace = jest.fn()
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(currentSearch),
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn(), refresh: mockRefresh }),
}))

// ── Mock du panneau Yaye partagé (GUIC-376) ─────────────────────────────────
const mockYayeOpen = jest.fn()
jest.mock('@/components/yaye/YayeProvider', () => ({
  useYayePanel: () => ({ isOpen: false, open: mockYayeOpen, close: jest.fn(), toggle: jest.fn() }),
}))

// ── Mocks composants lourds non testés ici ──────────────────────────────────
jest.mock('@/components/opportunites/FiltresPanel', () => ({
  FiltresPanel: () => <div data-testid="filtres-panel" />,
}))

jest.mock('@/components/opportunites/OpportunitesFiltersSheet', () => ({
  OpportunitesFiltersSheet: () => <div data-testid="filters-sheet" />,
}))

jest.mock('@/components/opportunites/OpportunitesListHeader', () => ({
  OpportunitesListHeader: () => <div data-testid="list-header" />,
}))

jest.mock('@/components/opportunites/OppCard', () => ({
  OppCard: () => <article data-testid="opp-card" />,
}))

jest.mock('@/components/opportunites/FavorisProvider', () => ({
  useFavoris: () => ({ has: () => false, toggle: jest.fn() }),
  FavorisProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/lib/regions', () => ({
  regionLabel: (r: string) => r,
}))

import React from 'react'
import { OpportunitesClient } from '@/components/opportunites/OpportunitesClient'

function setupFetch(ok: boolean, items: unknown[] = [], total = 0) {
  global.fetch = jest.fn(async () => {
    if (!ok) return { ok: false, status: 500 } as Response
    return { ok: true, json: async () => ({ data: items, meta: { total } }) } as Response
  })
}

beforeEach(() => {
  currentSearch = ''
  mockReplace.mockClear()
  mockRefresh.mockClear()
  mockYayeOpen.mockClear()
})

describe('GUIC-689 (Lot P3-A) — état vide enrichi', () => {
  it('sans filtre région actif : une seule action "Réinitialiser les filtres", pas de "Élargir la région"', async () => {
    currentSearch = 'type=Stage'
    setupFetch(true, [], 0)
    render(<OpportunitesClient initialRegion={null} />)

    expect(
      await screen.findByRole('button', { name: /réinitialiser les filtres/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /élargir la région/i })).not.toBeInTheDocument()
  })

  it('avec filtre région actif : "Élargir la région" retire region de l\'URL', async () => {
    currentSearch = 'region=Dakar'
    setupFetch(true, [], 0)
    render(<OpportunitesClient initialRegion={null} />)

    const widen = await screen.findByRole('button', { name: /élargir la région/i })
    expect(screen.getByRole('button', { name: /réinitialiser les filtres/i })).toBeInTheDocument()

    await userEvent.click(widen)
    expect(mockReplace).toHaveBeenCalledWith(
      expect.not.stringContaining('region='),
      expect.anything(),
    )
  })

  it('bandeau Yaye visible sous l\'état vide et ouvre le panneau existant au clic', async () => {
    currentSearch = 'type=Stage'
    setupFetch(true, [], 0)
    render(<OpportunitesClient initialRegion={null} />)

    await screen.findByRole('button', { name: /réinitialiser les filtres/i })
    const banner = screen.getByRole('button', { name: /yaye peut t'aider/i })
    await userEvent.click(banner)
    expect(mockYayeOpen).toHaveBeenCalledTimes(1)
  })
})

describe('GUIC-689 (Lot P3-A) — état d\'erreur illustré', () => {
  it('remplace la <div> rouge artisanale par EmptyState illustration="error"', async () => {
    setupFetch(false)
    const { container } = render(<OpportunitesClient initialRegion={null} />)

    await screen.findByRole('button', { name: /réessayer/i })
    expect(container.querySelector('svg[data-illustration="error"]')).toBeTruthy()
    expect(container.querySelector('.bg-gj-red-soft')).toBeNull()
  })

  it('cliquer "Réessayer" appelle router.refresh() (logique de retry inchangée)', async () => {
    setupFetch(false)
    render(<OpportunitesClient initialRegion={null} />)

    const btn = await screen.findByRole('button', { name: /réessayer/i })
    await userEvent.click(btn)
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })
})
