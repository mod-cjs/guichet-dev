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
  // GUIC-617 — PAS de `{ virtual: true }` ici : `qrcode` (1.5.4) EST installé. `virtual` est
  // réservé aux modules ABSENTS ; l'employer sur un module réel empoisonne le résolveur pour
  // les fichiers suivants du même process, qui reçoivent alors la VRAIE lib malgré leur
  // `jest.mock`. C'est ce qui rendait qr-badge.test.tsx rouge ~1 run sur 3 (le seul test qui
  // vérifie le `src` voyait un vrai QR). Reproduit puis corrigé : cette paire de fichiers
  // échouait 2 fois sur 3, elle passe 4 fois sur 4 sans `virtual`.
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
  it('rend les sections principales : carte + bénéfices + usages + actions', async () => {
    const ui = await MaCartePage()
    render(ui)
    expect(screen.getByRole('heading', { level: 1, name: /Ma carte CJS/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Tes derniers usages/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /À quoi sert ta carte/i })).toBeInTheDocument()
    // Section secondaire "Aller plus loin" conservée pour le funnel
    expect(screen.getByRole('heading', { name: /Aller plus loin/i })).toBeInTheDocument()
  })

  it('GUIC-398 — sous-titre = wording design source ("sésame")', async () => {
    const ui = await MaCartePage()
    render(ui)
    expect(
      screen.getByText(/Ton sésame pour accéder aux centres/i),
    ).toBeInTheDocument()
  })

  it('GUIC-398 — CTAs principaux = "Ajouter au portefeuille" (disabled) + "Partager"', async () => {
    const ui = await MaCartePage()
    render(ui)
    const wallet = screen.getByTestId('ma-carte-wallet-btn')
    expect(wallet).toBeInTheDocument()
    expect(wallet).toBeDisabled()
    expect(screen.getByTestId('ma-carte-share-btn')).toBeInTheDocument()
  })

  it('GUIC-398 — 4 bénéfices canoniques affichés', async () => {
    const ui = await MaCartePage()
    render(ui)
    expect(screen.getByText('Accès')).toBeInTheDocument()
    expect(screen.getByText('Check-in')).toBeInTheDocument()
    expect(screen.getByText('Retrait')).toBeInTheDocument()
    expect(screen.getByText('Hors-ligne')).toBeInTheDocument()
  })

  it('actions secondaires conservées — "Mes réservations" pointe sur /jeune/mes-reservations-centres', async () => {
    const ui = await MaCartePage()
    render(ui)
    const link = screen.getByRole('link', { name: /Mes réservations/i })
    expect(link).toHaveAttribute('href', '/jeune/mes-reservations-centres')
  })

  it('actions secondaires conservées — "Réserver une ressource" pointe sur /centres', async () => {
    const ui = await MaCartePage()
    render(ui)
    const link = screen.getByRole('link', { name: /Réserver une ressource/i })
    expect(link).toHaveAttribute('href', '/centres')
  })
})
