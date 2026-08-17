/**
 * @jest-environment node
 *
 * GUIC-706 — L'étape « centre principal » de l'accueil devient conditionnelle.
 *
 * Le parcours d'accueil est verrouillé — on ne peut pas le masquer. Mais son étape
 * « centre principal » charge la liste des centres : masquer les centres cassait donc un
 * parcours qu'on ne pouvait même pas fermer pour compenser. Le service refusait la bascule
 * (`requires`), ce qui protégeait le parcours mais rendait les centres définitivement
 * inouvrables au pilotage.
 *
 * L'étape se saute désormais quand les centres sont masqués — c'est la seule issue qui
 * préserve à la fois le parcours et le levier.
 */
const mockRedirect = jest.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})
jest.mock('next/navigation', () => ({ redirect: (u: string) => mockRedirect(u) }))

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }))

const mockEstMasquee = jest.fn()
jest.mock('@/lib/flags/ui-server', () => ({ estMasquee: (...a: unknown[]) => mockEstMasquee(...a) }))

jest.mock('@/lib/loaders/centres', () => ({ getCentresWithStatusAndHoraires: jest.fn(async () => []) }))
jest.mock('@/lib/loaders/profil-onboarding', () => ({
  suggestCentrePrincipal: jest.fn(async () => null),
  getUserRegion: jest.fn(async () => 'Dakar'),
  resolveOnboardingRegion: jest.fn(() => 'Dakar'),
}))
jest.mock('@/app/jeune/onboarding/centre-principal/centre-principal-form', () => ({ CentrePrincipalForm: () => null }))
jest.mock('@/app/jeune/onboarding/_screens-web/CentrePrincipalFormWeb', () => ({ CentrePrincipalFormWeb: () => null }))

import Page from '@/app/jeune/onboarding/centre-principal/page'

const JEUNE = { cjsUid: 'u1', roles: ['beneficiaire'], onboardingComplete: false, region: 'Dakar' }

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(JEUNE)
  mockEstMasquee.mockResolvedValue(false)
})

describe('étape « centre principal »', () => {
  it('s’affiche quand les centres sont ouverts', async () => {
    await expect(Page()).resolves.toBeDefined()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('passe à l’étape suivante quand les centres sont masqués', async () => {
    // Sauter plutôt que rendre : la page chargerait une liste vide et demanderait de
    // choisir parmi rien.
    mockEstMasquee.mockResolvedValue(true)
    await expect(Page()).rejects.toThrow('REDIRECT:/jeune/onboarding/recommandations')
  })

  it('ne charge pas les centres quand ils sont masqués', async () => {
    // Une requête pour une liste qu'on n'affichera pas, sur un parcours emprunté par
    // chaque nouveau compte.
    const { getCentresWithStatusAndHoraires } = jest.requireMock('@/lib/loaders/centres')
    mockEstMasquee.mockResolvedValue(true)
    await expect(Page()).rejects.toThrow()
    expect(getCentresWithStatusAndHoraires).not.toHaveBeenCalled()
  })

  it('vérifie la session avant tout', async () => {
    // L'ordre compte : décider du saut avant d'authentifier renseignerait un visiteur
    // anonyme sur l'état d'une fonctionnalité.
    mockGetSession.mockResolvedValue(null)
    await expect(Page()).rejects.toThrow('REDIRECT:/auth/connexion')
    expect(mockEstMasquee).not.toHaveBeenCalled()
  })
})
