/**
 * GUIC-689 — Parcours anonyme sans bruit console (charte « 0 erreur console »).
 *
 * Bug constaté au balayage Playwright local (2026-07-30) : sur les pages
 * publiques /ressources et /ressources/[id], le client fetche
 * `/api/favoris/ressources/ids` même sans session → 401 systématique loggé en
 * erreur par le navigateur pour chaque visiteur anonyme.
 *
 * Attendu (motif déjà en place sur /centres : prop `userIsConnected` calculée
 * côté serveur) : le fetch d'hydratation des favoris n'est émis QUE si
 * l'utilisateur est connecté.
 */
import { render, act } from '@testing-library/react'
import type { ComponentProps } from 'react'

import { RessourcesClient } from '@/components/ressources/RessourcesClient'
import { RessourceDetailClient } from '@/app/(public)/ressources/[id]/ressource-detail-client'
import type { RessourceFiltres } from '@/lib/loaders/ressources'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/ressources',
  useSearchParams: () => new URLSearchParams(''),
}))

const FAVORIS_IDS_URL = '/api/favoris/ressources/ids'

function fetchCallsTo(url: string): number {
  return (global.fetch as jest.Mock).mock.calls.filter(([u]) => u === url).length
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: [] }),
  })
})

function listProps(userIsConnected: boolean): ComponentProps<typeof RessourcesClient> {
  const filters: RessourceFiltres = { date: 'all', page: 1 }
  return {
    initialItems: [],
    total: 0,
    page: 1,
    pageSize: 20,
    initialFilters: filters,
    userIsConnected,
  } as unknown as ComponentProps<typeof RessourcesClient>
}

function detailProps(userIsConnected: boolean): ComponentProps<typeof RessourceDetailClient> {
  return {
    detail: {
      id: 'r1',
      titre: 'Ressource',
      description: 'desc',
      type: 'PDF',
      theme: 'Thème',
      url: 'https://exemple.org/x.pdf',
      vues: 3,
      niveau: null,
      langue: null,
      categorie: null,
      createdAt: '2026-05-01T00:00:00.000Z',
      tailleBytes: null,
      pages: null,
      duree: null,
      programmes: [],
    },
    pageUrl: 'https://guichet.example/ressources/r1',
    userIsConnected,
  } as unknown as ComponentProps<typeof RessourceDetailClient>
}

describe('GUIC-689 — favoris ressources : pas de fetch en anonyme', () => {
  it('RessourcesClient anonyme : aucun appel à /api/favoris/ressources/ids', async () => {
    await act(async () => {
      render(<RessourcesClient {...listProps(false)} />)
    })
    expect(fetchCallsTo(FAVORIS_IDS_URL)).toBe(0)
  })

  it('RessourcesClient connecté : hydrate les favoris', async () => {
    await act(async () => {
      render(<RessourcesClient {...listProps(true)} />)
    })
    expect(fetchCallsTo(FAVORIS_IDS_URL)).toBe(1)
  })

  it('RessourceDetailClient anonyme : aucun appel à /api/favoris/ressources/ids', async () => {
    await act(async () => {
      render(<RessourceDetailClient {...detailProps(false)} />)
    })
    expect(fetchCallsTo(FAVORIS_IDS_URL)).toBe(0)
  })

  it('RessourceDetailClient connecté : hydrate l’état favori', async () => {
    await act(async () => {
      render(<RessourceDetailClient {...detailProps(true)} />)
    })
    expect(fetchCallsTo(FAVORIS_IDS_URL)).toBe(1)
  })

  it('les pages serveur transmettent userIsConnected (dérivé de getSession)', () => {
    const { readFileSync } = jest.requireActual('node:fs') as typeof import('node:fs')
    const { resolve } = jest.requireActual('node:path') as typeof import('node:path')
    const root = resolve(__dirname, '../..')
    for (const rel of [
      'src/app/(public)/ressources/page.tsx',
      'src/app/(public)/ressources/[id]/page.tsx',
    ]) {
      const src = readFileSync(resolve(root, rel), 'utf-8')
      expect(src).toContain('getSession')
      expect(src).toContain('userIsConnected')
    }
  })
})
