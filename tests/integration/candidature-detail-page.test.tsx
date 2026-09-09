/**
 * Tests d'intégration de la page détail candidature (GUIC-253).
 *
 * Page = Server Component async — testée en l'appelant directement.
 * Mocks : `getSession`, `loadCandidatureDetail`, `next/navigation`.
 */
import { render, screen } from '@testing-library/react'

const mockGetSession = jest.fn()
const mockLoad = jest.fn()
const mockRedirect = jest.fn((..._args: unknown[]): never => {
  throw new Error('NEXT_REDIRECT')
})
const mockNotFound = jest.fn((..._args: unknown[]): never => {
  throw new Error('NEXT_NOT_FOUND')
})

jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))
jest.mock('@/lib/candidature-detail-loader', () => ({
  loadCandidatureDetail: (...a: unknown[]) => mockLoad(...a),
}))
jest.mock('next/navigation', () => ({
  redirect: (...a: unknown[]) => mockRedirect(...a),
  notFound: (...a: unknown[]) => mockNotFound(...a),
  // GUIC-689 — l'écran porte désormais `RetraitCandidature`, un composant client
  // qui rafraîchit la page après le retrait. Sans routeur monté, React lève
  // « invariant expected app router to be mounted ».
  useRouter: () => ({ refresh: jest.fn() }),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Page = require('@/app/jeune/(app)/mes-candidatures/[id]/page').default

const SESSION = { cjsUid: 'uid-1', prenom: 'Awa', telephone: '+221770000000' }
const DTO = {
  id: 'cand-1',
  statut: 'En_attente' as const,
  lettreMotivation: 'Voici ma motivation',
  cvUrl: 'https://cdn/cv.pdf',
  soumiseA: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-02T11:00:00.000Z',
  opportunite: {
    slug: 'stage-data',
    titre: 'Stage Data — Sonatel',
    organisation: 'Sonatel',
    deadline: '2026-06-30T23:59:59.000Z',
    type: 'Stage' as const,
    domaine: 'Numerique' as const,
    description: 'Mission analytics…',
  },
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Candidature detail — page', () => {
  it('redirige vers /auth/connexion si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(
      Page({ params: Promise.resolve({ id: 'cand-1' }) }),
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/auth/connexion')
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('appelle notFound() quand la candidature est introuvable / n\'appartient pas au user', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    mockLoad.mockResolvedValue(null)
    await expect(
      Page({ params: Promise.resolve({ id: 'cand-x' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockLoad).toHaveBeenCalledWith('cand-x', 'uid-1')
  })

  it('rend le composant CandidatureDetail quand le loader renvoie un DTO', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    mockLoad.mockResolvedValue(DTO)
    const ui = await Page({ params: Promise.resolve({ id: 'cand-1' }) })
    render(ui)
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Stage Data — Sonatel')
    expect(screen.getByTestId('detail-status-pill')).toBeInTheDocument()
    // GUIC-364/415 — le CV passe par un proxy privé (ownership) plutôt que
    // l'URL CDN directe : /api/candidatures/<id>/cv.
    expect(screen.getByTestId('detail-cv-link')).toHaveAttribute('href', '/api/candidatures/cand-1/cv')
  })

  it('omet le lien CV si le DTO n\'en a pas (cvUrl null)', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    mockLoad.mockResolvedValue({ ...DTO, cvUrl: null })
    const ui = await Page({ params: Promise.resolve({ id: 'cand-1' }) })
    render(ui)
    expect(screen.queryByTestId('detail-cv-link')).toBeNull()
    expect(screen.getByTestId('detail-cv-empty')).toBeInTheDocument()
  })
})
