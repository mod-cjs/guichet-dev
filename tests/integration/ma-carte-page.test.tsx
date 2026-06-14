/** @jest-environment jsdom */
/**
 * Tests d'intégration `/jeune/(app)/ma-carte` (Wave 6.1 / GUIC-386).
 * Couvre la composition (3 sections) + CTAs.
 */
import { render, screen } from '@testing-library/react'

jest.mock(
  'qrcode',
  () => ({
    __esModule: true,
    default: {
      toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,AA'),
    },
  }),
  { virtual: true },
)

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(async () => ({
    cjsUid: 'cjs-abc123',
    prenom: 'Aminata',
    nom: 'Diop',
  })),
}))

jest.mock('@/lib/profil-loader', () => ({
  loadProfilComplet: jest.fn(async () => ({
    cjsUid: 'cjs-abc123',
    prenom: 'Aminata',
    nom: 'Diop',
    profil: { photoUrl: null },
  })),
}))

jest.mock('@/lib/loaders/centres', () => ({
  getMesUsages: jest.fn(async () => []),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune: {
      findUnique: jest.fn(async () => ({ createdAt: new Date('2025-03-15') })),
    },
  },
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

// fetch stub : auto-track + qr-token
global.fetch = jest.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    data: {
      token: 'a.b.c',
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      refreshAt: new Date(Date.now() + 14 * 60_000).toISOString(),
    },
  }),
})) as unknown as typeof fetch

import MaCartePage from '@/app/jeune/(app)/ma-carte/page'

describe('MaCartePage', () => {
  it('rend les 3 sections : carte + usages + CTAs', async () => {
    const ui = await MaCartePage()
    render(ui)
    expect(screen.getByRole('heading', { level: 1, name: /Ma carte CJS/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Tes derniers usages/i })).toBeInTheDocument()
    // CTAs
    expect(screen.getByRole('link', { name: /Mes réservations/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Réserver une ressource/i })).toBeInTheDocument()
  })

  it('CTA "Mes réservations" pointe sur /jeune/mes-reservations-centres', async () => {
    const ui = await MaCartePage()
    render(ui)
    const link = screen.getByRole('link', { name: /Mes réservations/i })
    expect(link).toHaveAttribute('href', '/jeune/mes-reservations-centres')
  })

  it('CTA "Réserver une ressource" pointe sur /centres', async () => {
    const ui = await MaCartePage()
    render(ui)
    const link = screen.getByRole('link', { name: /Réserver une ressource/i })
    expect(link).toHaveAttribute('href', '/centres')
  })
})
