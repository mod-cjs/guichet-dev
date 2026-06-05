/**
 * @jest-environment jsdom
 *
 * Tests UI écrans WEB 3-4-5 (objectifs, profil, recommandations).
 * GUIC-195 phase 3-1. Mocks fetch sur draft + onboarding API.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingObjectifsWeb } from '@/app/jeune/onboarding/_screens-web/OnboardingObjectifsWeb'
import { OnboardingProfilWeb } from '@/app/jeune/onboarding/_screens-web/OnboardingProfilWeb'
import { OnboardingRecommandationsWeb } from '@/app/jeune/onboarding/_screens-web/OnboardingRecommandationsWeb'
import { __resetDraftCache } from '@/lib/onboarding-draft'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

interface DraftRow {
  objectifs: string[] | null
  prenom: string | null; nom: string | null; telephone: string | null
  dateNaissance: string | null; genre: string | null
  region: string | null; commune: string | null; updatedAt: string
}

let draftStore: DraftRow | null = null
let onboardingCalls: Array<{ step: number; data: unknown }> = []

function jsonRes(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response
}

beforeEach(() => {
  pushMock.mockClear()
  draftStore = null
  onboardingCalls = []
  __resetDraftCache()
  global.fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = typeof url === 'string' ? url : url.toString()
    const method = init?.method ?? 'GET'
    if (u.startsWith('/api/onboarding/draft')) {
      if (method === 'GET') return jsonRes({ data: draftStore })
      if (method === 'PATCH') {
        const patch = JSON.parse(init?.body as string) as Partial<DraftRow>
        draftStore = {
          ...(draftStore ?? {
            objectifs: null, prenom: null, nom: null, telephone: null,
            dateNaissance: null, genre: null, region: null, commune: null,
            updatedAt: '',
          }),
          ...patch,
          updatedAt: new Date().toISOString(),
        }
        return jsonRes({ data: draftStore })
      }
      if (method === 'DELETE') { draftStore = null; return jsonRes({}, 204) }
    }
    if (u.startsWith('/api/v1/onboarding')) {
      const body = JSON.parse(init?.body as string) as { step: number; data: unknown }
      onboardingCalls.push(body)
      return jsonRes({ data: { ok: true } })
    }
    return jsonRes({}, 404)
  }) as unknown as typeof fetch
})

// ─── Écran 3 web ────────────────────────────────────────────────────────────

describe('OnboardingObjectifsWeb', () => {
  test('rend la Yaye bar et les 5 objectifs', async () => {
    render(<OnboardingObjectifsWeb prenom="Awa" />)
    expect(screen.getByText(/Salam Awa/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Trouver un emploi/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lancer mon projet/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Me former/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agriculture/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /M'engager/i })).toBeInTheDocument()
  })

  test('toggle un objectif met à jour le compteur', async () => {
    render(<OnboardingObjectifsWeb />)
    fireEvent.click(screen.getByRole('button', { name: /Trouver un emploi/i }))
    await waitFor(() => expect(screen.getByText(/1 sélectionné/)).toBeInTheDocument())
  })

  test('Continuer navigue vers /jeune/onboarding/profil', async () => {
    render(<OnboardingObjectifsWeb />)
    fireEvent.click(screen.getByRole('button', { name: /Continuer/i }))
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/profil'))
  })
})

// ─── Écran 4 web ────────────────────────────────────────────────────────────

describe('OnboardingProfilWeb', () => {
  const initial = {
    prenom: 'Awa', nom: 'Diop',
    dateNaissance: '2003-01-15', genre: 'F' as const,
    region: 'Tambacounda', commune: '',
  }

  test('rend les champs prénom, nom, date, genre', () => {
    render(<OnboardingProfilWeb initial={initial} />)
    expect(screen.getByLabelText(/Prénom/i)).toHaveValue('Awa')
    expect(screen.getByLabelText(/^Nom/i)).toHaveValue('Diop')
    expect(screen.getByLabelText(/Date de naissance/i)).toHaveValue('2003-01-15')
  })

  test('Continuer appelle steps 1 + 2 API et redirige', async () => {
    render(<OnboardingProfilWeb initial={initial} />)
    fireEvent.click(screen.getByRole('button', { name: /^Continuer/i }))
    await waitFor(() => expect(onboardingCalls).toHaveLength(2))
    expect(onboardingCalls[0]?.step).toBe(1)
    expect(onboardingCalls[1]?.step).toBe(2)
    expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/recommandations')
  })
})

// ─── Écran 5 web ────────────────────────────────────────────────────────────

describe('OnboardingRecommandationsWeb', () => {
  test('rend 3 cards opps mockées et le heading personnalisé', () => {
    render(<OnboardingRecommandationsWeb prenom="Awa" />)
    expect(screen.getByText(/Voilà 3 opps faites pour toi, Awa/)).toBeInTheDocument()
    expect(screen.getByText(/Bourse agricole/)).toBeInTheDocument()
    expect(screen.getByText(/Stage agronomie/)).toBeInTheDocument()
    expect(screen.getByText(/Concours Jeunes Entrepreneurs/)).toBeInTheDocument()
  })

  test('Aller à mon espace finalise (step 3) puis redirige', async () => {
    render(<OnboardingRecommandationsWeb />)
    fireEvent.click(screen.getByRole('button', { name: /Aller à mon espace/i }))
    await waitFor(() => expect(onboardingCalls).toHaveLength(1))
    expect(onboardingCalls[0]?.step).toBe(3)
    expect(pushMock).toHaveBeenCalledWith('/jeune/tableau-de-bord')
  })
})
