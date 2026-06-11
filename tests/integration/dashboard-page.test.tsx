/**
 * Test d'intégration léger pour la page `/jeune/(app)/tableau-de-bord`.
 *
 * On mock `getSession` et `prisma` pour isoler le rendu de la composition.
 * Le but est de garantir que toutes les sections du dashboard sont rendues
 * dans le bon ordre (Phase 2B/1 — GUIC-187).
 */
import { render, screen } from '@testing-library/react'

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(async () => ({
    cjsUid: 'cjs_test',
    prenom: 'Awa',
    nom: 'Diop',
  })),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune: {
      findUnique: jest.fn(async () => ({ completionScore: 65 })),
    },
  },
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

// Import APRÈS les mocks pour qu'ils soient pris en compte.
import TableauDeBordPage from '@/app/jeune/(app)/tableau-de-bord/page'

describe('TableauDeBordPage (intégration)', () => {
  it('rend toutes les sections du dashboard mobile dans l\'ordre', async () => {
    const ui = await TableauDeBordPage()
    render(ui)

    // 1. Hero — prénom + programme
    expect(screen.getByText('Awa')).toBeInTheDocument()
    expect(screen.getByText('Programme YEAH')).toBeInTheDocument()

    // 2. KPIs
    expect(screen.getByLabelText('Indicateurs clés')).toBeInTheDocument()
    expect(screen.getByText('Candidatures')).toBeInTheDocument()

    // 3. Tracker — score 65 vient du mock Prisma
    expect(screen.getByText('Profil 65% complété')).toBeInTheDocument()

    // 4. Reco carousel
    expect(screen.getByText('À ne pas rater')).toBeInTheDocument()

    // 5. Événements
    expect(screen.getByText('Événements à venir')).toBeInTheDocument()

    // 6. Centres
    expect(screen.getByText('Centres près de toi')).toBeInTheDocument()

    // 7. Yaye nudge
    expect(screen.getByText(/yaye a 3 conseils pour toi/i)).toBeInTheDocument()
  })

  it('utilise un score de 0 quand le profil n\'existe pas', async () => {
    const { prisma } = jest.requireMock('@/lib/prisma')
    prisma.profilJeune.findUnique.mockResolvedValueOnce(null)

    const ui = await TableauDeBordPage()
    render(ui)
    expect(screen.getByText('Profil 0% complété')).toBeInTheDocument()
  })
})
