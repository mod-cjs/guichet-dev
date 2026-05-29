/**
 * @jest-environment jsdom
 *
 * Test d'intégration léger : flow complet 5 écrans onboarding mobile.
 *
 * Depuis GUIC-181, le draft est persisté côté serveur (API
 * `/api/onboarding/draft`). On mocke `fetch` et on vérifie que :
 * - Les sélections envoient des PATCH au backend.
 * - La finalisation appelle `/api/v1/onboarding` step 3 puis DELETE draft.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingObjectifs } from '@/app/jeune/onboarding/_screens/OnboardingObjectifs'
import { OnboardingProfil } from '@/app/jeune/onboarding/_screens/OnboardingProfil'
import { OnboardingRecommandations } from '@/app/jeune/onboarding/_screens/OnboardingRecommandations'
import { __resetDraftCache } from '@/lib/onboarding-draft'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

// ── Helper fetch mock ──────────────────────────────────────────────────────

interface DraftRow {
  objectifs:     string[] | null
  telephone:     string | null
  prenom:        string | null
  nom:           string | null
  dateNaissance: string | null
  genre:         string | null
  region:        string | null
  commune:       string | null
  updatedAt:     string
}

let draftStore: DraftRow | null = null

function emptyDraft(overrides: Partial<DraftRow> = {}): DraftRow {
  return {
    objectifs: null, telephone: null, prenom: null, nom: null,
    dateNaissance: null, genre: null, region: null, commune: null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function jsonRes(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function setupFetchMock() {
  global.fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = typeof url === 'string' ? url : url.toString()
    const method = init?.method ?? 'GET'

    if (u.startsWith('/api/onboarding/draft')) {
      if (method === 'GET') {
        return jsonRes({ data: draftStore })
      }
      if (method === 'PATCH') {
        const patch = JSON.parse(init?.body as string) as Partial<DraftRow>
        draftStore = { ...(draftStore ?? emptyDraft()), ...patch, updatedAt: new Date().toISOString() }
        return jsonRes({ data: draftStore })
      }
      if (method === 'DELETE') {
        draftStore = null
        return { ok: true, status: 204, json: async () => null } as unknown as Response
      }
    }

    if (u.startsWith('/api/v1/onboarding')) {
      return jsonRes({ data: { nextStep: null, onboardingComplete: true } })
    }

    return jsonRes({ data: null })
  }) as unknown as typeof fetch
}

describe('Onboarding flow — intégration 5 écrans (Prisma draft)', () => {
  beforeEach(() => {
    pushMock.mockClear()
    draftStore = null
    __resetDraftCache()
    setupFetchMock()
  })

  it('Objectifs : PATCH le draft et navigue vers /profil', async () => {
    render(<OnboardingObjectifs prenom="Awa" />)
    fireEvent.click(screen.getByRole('button', { name: /trouver un emploi/i }))
    fireEvent.click(screen.getByRole('button', { name: /agriculture/i }))
    fireEvent.click(screen.getByRole('button', { name: /^continuer/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/profil'))
    expect(draftStore?.objectifs).toEqual(['emploi', 'agriculture'])
  })

  it('Recommandations finalise avec PUT step 3 + DELETE draft', async () => {
    draftStore = emptyDraft({
      objectifs: ['agriculture'], prenom: 'Awa', region: 'Tambacounda',
    })

    render(<OnboardingRecommandations prenom="Awa" />)
    expect(screen.getByText(/top awa/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/à tambacounda/i)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /aller au tableau de bord/i }))
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/jeune/tableau-de-bord'))

    const calls = (global.fetch as jest.Mock).mock.calls
    const putCall = calls.find(c => (c[1]?.method ?? 'GET') === 'PUT')
    expect(putCall).toBeDefined()
    const body = JSON.parse(putCall![1].body)
    expect(body.step).toBe(3)
    expect(body.data.domainesInteret).toContain('Agriculture')

    // DELETE appelé → draftStore vidé
    expect(draftStore).toBeNull()
  })
})
