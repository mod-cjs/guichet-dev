import { render, screen } from '@testing-library/react'
import type { CandidatureMock } from '@/components/candidatures'

const mockGetSession = jest.fn()
const mockLoad = jest.fn()
const mockRedirect = jest.fn((_: string) => {
  throw new Error('REDIRECT')
})

jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))
jest.mock('@/lib/loaders/mes-candidatures', () => ({
  loadMesCandidatures: (...a: unknown[]) => mockLoad(...a),
}))
jest.mock('next/navigation', () => ({
  redirect: (path: string) => mockRedirect(path),
  useRouter: () => ({ push: jest.fn() }),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Page = require('@/app/jeune/(app)/mes-candidatures/page').default

const SAMPLE: CandidatureMock[] = [
  {
    id: 'c1',
    opportuniteSlug: 'stage-agri',
    opportuniteTitre: 'Stage agri',
    organisation: 'CJS',
    type: 'Stage',
    currentStep: 'Envoyee',
    decision: null,
    envoyeeA: '2026-05-30T14:30:00.000Z',
  },
]

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue({ cjsUid: 'uid-1', prenom: 'Awa' })
  mockLoad.mockResolvedValue(SAMPLE)
})

describe('Mes candidatures — page intégration (GUIC-237)', () => {
  it('appelle le loader avec cjsUid de la session et rend le H1', async () => {
    const ui = await Page()
    render(ui)
    expect(mockLoad).toHaveBeenCalledWith('uid-1')
    expect(screen.getByRole('heading', { level: 1, name: /Mes candidatures/i })).toBeInTheDocument()
  })

  it('rend la liste hydratée depuis le loader (1 item ici)', async () => {
    const ui = await Page()
    render(ui)
    expect(screen.getAllByRole('listitem')).toHaveLength(SAMPLE.length)
  })

  it('redirige vers /auth/connexion si pas de session', async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(Page()).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/auth/connexion')
    expect(mockLoad).not.toHaveBeenCalled()
  })
})
