/**
 * @jest-environment jsdom
 *
 * Tests UI écran 3/5 — sélection d'objectifs. Depuis GUIC-181 le draft est
 * persisté serveur via /api/onboarding/draft : on mocke `fetch` et on
 * inspecte les bodies PATCH plutôt que `sessionStorage`.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingObjectifs } from '@/app/jeune/onboarding/_screens/OnboardingObjectifs'
import { __resetDraftCache } from '@/lib/onboarding-draft'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

interface DraftRow {
  objectifs: string[] | null
  prenom: string | null; nom: string | null
  telephone: string | null; dateNaissance: string | null
  genre: string | null; region: string | null; commune: string | null
  updatedAt: string
}

let draftStore: DraftRow | null = null

function jsonRes(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response
}

beforeEach(() => {
  pushMock.mockClear()
  draftStore = null
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
    }
    return jsonRes({ data: null })
  }) as unknown as typeof fetch
})

describe('<OnboardingObjectifs /> — écran 3/5', () => {
  it('affiche les 5 objectifs', () => {
    render(<OnboardingObjectifs />)
    expect(screen.getByRole('button', { name: /trouver un emploi/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /lancer mon projet/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /me former/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agriculture/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /engager/i })).toBeInTheDocument()
  })

  it('multi-sélection (toggle aria-pressed) et PATCH du draft', async () => {
    render(<OnboardingObjectifs />)
    const emploi = screen.getByRole('button', { name: /trouver un emploi/i })
    const projet = screen.getByRole('button', { name: /lancer mon projet/i })

    expect(emploi).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(emploi)
    expect(emploi).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(projet)
    expect(projet).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() => expect(draftStore?.objectifs).toEqual(['emploi', 'projet']))

    fireEvent.click(emploi)
    expect(emploi).toHaveAttribute('aria-pressed', 'false')
  })

  it('CTA primaire affiche le compteur', () => {
    render(<OnboardingObjectifs />)
    fireEvent.click(screen.getByRole('button', { name: /lancer mon projet/i }))
    fireEvent.click(screen.getByRole('button', { name: /me former/i }))
    expect(screen.getByRole('button', { name: /continuer · 2 sélectionnés/i })).toBeInTheDocument()
  })

  it('Continuer redirige vers /jeune/onboarding/profil', async () => {
    render(<OnboardingObjectifs />)
    fireEvent.click(screen.getByRole('button', { name: /lancer mon projet/i }))
    fireEvent.click(screen.getByRole('button', { name: /^continuer/i }))
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/profil'))
  })

  it('Passer redirige vers profil et vide les objectifs', async () => {
    render(<OnboardingObjectifs />)
    fireEvent.click(screen.getByRole('button', { name: /lancer mon projet/i }))
    fireEvent.click(screen.getByRole('button', { name: /passer/i }))
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/profil'))
    expect(draftStore?.objectifs).toEqual([])
  })

  it('greeting Yaye inclut le prénom si fourni', () => {
    render(<OnboardingObjectifs prenom="Awa" />)
    expect(screen.getByText(/salam awa/i)).toBeInTheDocument()
  })
})
