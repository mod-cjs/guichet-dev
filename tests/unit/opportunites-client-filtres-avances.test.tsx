/**
 * @jest-environment jsdom
 *
 * GUIC-689 — `OpportunitesClient` : couverture bout-en-bout du round-trip
 * remuneration/deadline (URL -> état -> fetch API -> badge/chips affichés).
 *
 * Le bug corrigé par ce ticket vivait côté serveur (route + loader ne lisaient
 * jamais ces deux params) — ce fichier verrouille le côté client, jusqu'ici
 * sans aucune couverture dédiée, pour que toute régression future sur le
 * comptage du badge, la construction de l'URL/requête API ou l'affichage des
 * chips actives soit détectée ici plutôt qu'en production.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mocks Next ──────────────────────────────────────────────────────────────
let currentSearch = ''
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(currentSearch),
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
}))

jest.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, ...rest }: { name: string; [k: string]: unknown }) => (
    <svg data-testid={`icon-${name}`} aria-hidden {...rest} />
  ),
}))

jest.mock('@/components/opportunites/FiltresPanel', () => ({
  FiltresPanel: ({ onChange }: { onChange: (v: { remuneration?: string; deadline?: string }) => void }) => (
    <div data-testid="filtres-panel">
      <button type="button" onClick={() => onChange({ remuneration: 'yes' })} data-testid="fp-remuneration-yes">
        Rémunéré
      </button>
      <button type="button" onClick={() => onChange({ deadline: '7' })} data-testid="fp-deadline-7">
        Moins de 7 jours
      </button>
    </div>
  ),
}))

jest.mock('@/components/opportunites/OpportunitesFiltersSheet', () => ({
  OpportunitesFiltersSheet: () => <div data-testid="filters-sheet" />,
}))

// Expose `activeChips` (non couvert par les mocks existants d'autres suites) pour
// vérifier que remuneration/deadline apparaissent bien comme chips actives.
jest.mock('@/components/opportunites/OpportunitesListHeader', () => ({
  OpportunitesListHeader: ({
    activeChips,
  }: {
    activeChips: { key: string; label: string }[]
  }) => (
    <div data-testid="list-header">
      {activeChips.map((c) => (
        <span key={c.key} data-testid={`chip-${c.key}`}>
          {c.label}
        </span>
      ))}
    </div>
  ),
}))

jest.mock('@/components/opportunites/OppCard', () => ({
  OppCard: ({ item }: { item: { id: string; titre: string } }) => (
    <article data-testid="opp-card">{item.titre}</article>
  ),
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

const ITEMS = [
  { id: 'opp-1', titre: 'Stage Data Science', type: 'Stage', slug: 'stage-data', organisation: 'CJS', region: 'DAKAR', deadline: null, domaine: 'TECH', statut: 'PUBLIE', vues: 0 },
]

let fetchMock: jest.Mock

function setupFetch(items = ITEMS, total = items.length) {
  fetchMock = jest.fn(async (url: RequestInfo | URL) => {
    const u = url.toString()
    if (u.includes('/api/opportunites')) {
      return { ok: true, json: async () => ({ data: items, meta: { total } }) } as Response
    }
    return { ok: true, json: async () => ({}) } as Response
  })
  global.fetch = fetchMock
}

beforeEach(() => {
  currentSearch = ''
  mockReplace.mockClear()
  setupFetch()
})

describe('GUIC-689 — OpportunitesClient : round-trip remuneration/deadline', () => {
  it('cocher "Rémunéré" dans FiltresPanel écrit remuneration=yes dans l\'URL', async () => {
    render(<OpportunitesClient initialRegion={null} />)
    await userEvent.click(screen.getByTestId('fp-remuneration-yes'))
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('remuneration=yes'),
      expect.anything(),
    )
  })

  it('cocher "Moins de 7 jours" écrit deadline=7 dans l\'URL', async () => {
    render(<OpportunitesClient initialRegion={null} />)
    await userEvent.click(screen.getByTestId('fp-deadline-7'))
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('deadline=7'),
      expect.anything(),
    )
  })

  it('remuneration=yes&deadline=7 dans l\'URL initiale : le fetch vers /api/opportunites les transmet bien', async () => {
    currentSearch = 'remuneration=yes&deadline=7'
    render(<OpportunitesClient initialRegion={null} />)
    // Le premier appel fetch doit porter les deux paramètres — c'est précisément
    // ce qui manquait avant le fix (route.ts les ignorait silencieusement).
    const calledUrl = (fetchMock.mock.calls[0]?.[0] as string) ?? ''
    expect(calledUrl).toContain('remuneration=yes')
    expect(calledUrl).toContain('deadline=7')
  })

  it('le badge mobile "N filtres actifs" compte remuneration + deadline', () => {
    currentSearch = 'remuneration=yes&deadline=7'
    render(<OpportunitesClient initialRegion={null} />)
    const badge = screen.getByTestId('filters-badge')
    expect(badge).toHaveTextContent('2')
  })

  it('les chips actives affichent "Rémunéré" et "J-7" quand ces filtres sont dans l\'URL', () => {
    currentSearch = 'remuneration=yes&deadline=7'
    render(<OpportunitesClient initialRegion={null} />)
    expect(screen.getByTestId('chip-rem-yes')).toHaveTextContent('Rémunéré')
    expect(screen.getByTestId('chip-dl-7')).toHaveTextContent('J-7')
  })

  it('remuneration=no affiche la chip "Non rémunéré"', () => {
    currentSearch = 'remuneration=no'
    render(<OpportunitesClient initialRegion={null} />)
    expect(screen.getByTestId('chip-rem-no')).toHaveTextContent('Non rémunéré')
  })
})
