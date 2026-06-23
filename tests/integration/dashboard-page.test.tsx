/**
 * Test d'intégration léger pour la page `/jeune/(app)/tableau-de-bord`.
 *
 * On mock `getSession` et `prisma` pour isoler le rendu de la composition.
 * Le but est de garantir que les sections du dashboard web (réécrites
 * GUIC-206/404/412) sont rendues : hero, KPIs, carrousel reco, événements,
 * centres et le panneau Yaye.
 */
import { render, screen } from '@testing-library/react'

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(async () => ({
    cjsUid: 'cjs_test',
    prenom: 'Awa',
    nom: 'Diop',
  })),
}))

// Profil par défaut : couvre la requête page (completionScore) ET la requête
// loader (domainesInteret / utilisateur.region).
const defaultProfil = {
  completionScore: 65,
  domainesInteret: ['Numérique'],
  utilisateur: { region: 'Dakar' },
}

jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune: {
      findUnique: jest.fn(async () => defaultProfil),
    },
    // loadDashboardCounts
    candidature: {
      count: jest.fn(async () => 2),
      findMany: jest.fn(async () => []),
    },
    inscriptionEvenement: { count: jest.fn(async () => 1) },
    ressourceFavorite: { count: jest.fn(async () => 3) },
    opportuniteFavorite: { count: jest.fn(async () => 0) },
    certificatMoodle: { count: jest.fn(async () => 0) },
    experience: { count: jest.fn(async () => 0) },
    diplome: { count: jest.fn(async () => 0) },
    // loadDashboardData
    opportunite: { findMany: jest.fn(async () => []) },
    evenement: { findMany: jest.fn(async () => []) },
    centre: { findMany: jest.fn(async () => []) },
  },
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

// Import APRÈS les mocks pour qu'ils soient pris en compte.
import TableauDeBordPage from '@/app/jeune/(app)/tableau-de-bord/page'

describe('TableauDeBordPage (intégration)', () => {
  it('rend les sections du dashboard web', async () => {
    const ui = await TableauDeBordPage()
    render(ui)

    // 1. Hero — salutation avec le prénom
    expect(screen.getByText('Awa')).toBeInTheDocument()

    // 2. KPIs
    expect(screen.getByLabelText('Indicateurs clés')).toBeInTheDocument()
    expect(screen.getByText('Candidatures en cours')).toBeInTheDocument()

    // 3. Reco carousel (titre par défaut)
    expect(screen.getByText('À ne pas rater')).toBeInTheDocument()

    // 4. Événements
    expect(screen.getByText('Événements à venir')).toBeInTheDocument()

    // 5. Centres
    expect(screen.getByText('Centres CJS près de toi')).toBeInTheDocument()

    // 6. Panneau Yaye
    expect(screen.getByLabelText('Yaye, ton agent IA')).toBeInTheDocument()
  })

  it('utilise un score de 0 quand le profil n\'existe pas', async () => {
    const { prisma } = jest.requireMock('@/lib/prisma')
    // Les deux requêtes findUnique (page + loader) reçoivent null.
    prisma.profilJeune.findUnique.mockResolvedValue(null)

    const ui = await TableauDeBordPage()
    render(ui)
    // Le nudge profil affiche le pourcentage de complétude (0%).
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})
