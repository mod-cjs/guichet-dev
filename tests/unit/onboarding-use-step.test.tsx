/**
 * @jest-environment jsdom
 *
 * Tests unitaires du hook partagé `use-onboarding-step` (GUIC-195) :
 * logique réutilisée entre les écrans mobile (`_screens`) et web
 * (`_screens-web`).
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useObjectifsStep,
  useProfilStep,
  useRecommandationsStep,
  mapObjectifToDomaine,
} from '@/app/jeune/onboarding/_logic/use-onboarding-step'
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

describe('mapObjectifToDomaine', () => {
  test('mappe les objectifs vers le domaine Prisma', () => {
    expect(mapObjectifToDomaine('agriculture')).toBe('Agriculture')
    expect(mapObjectifToDomaine('projet')).toBe('Entrepreneuriat')
    expect(mapObjectifToDomaine('formation')).toBe('Education')
    expect(mapObjectifToDomaine('engagement')).toBe('Citoyennete')
    expect(mapObjectifToDomaine('emploi')).toBeNull()
    expect(mapObjectifToDomaine('inconnu')).toBeNull()
  })
})

describe('useObjectifsStep', () => {
  test('toggle ajoute / retire un objectif et persiste', async () => {
    const { result } = renderHook(() => useObjectifsStep())
    expect(result.current.selected).toEqual([])

    await act(async () => { result.current.toggle('emploi') })
    expect(result.current.selected).toEqual(['emploi'])

    await act(async () => { result.current.toggle('projet') })
    expect(result.current.selected).toEqual(['emploi', 'projet'])
    expect(result.current.count).toBe(2)

    await act(async () => { result.current.toggle('emploi') })
    expect(result.current.selected).toEqual(['projet'])
  })

  test('next() push la route fournie', async () => {
    const { result } = renderHook(() => useObjectifsStep('/jeune/onboarding/profil'))
    await act(async () => { await result.current.next() })
    expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/profil')
  })

  test('skip() vide la sélection avant de naviguer', async () => {
    const { result } = renderHook(() => useObjectifsStep())
    await act(async () => { result.current.toggle('emploi') })
    await act(async () => { await result.current.skip() })
    expect(pushMock).toHaveBeenCalled()
  })
})

describe('useProfilStep', () => {
  const initial = {
    prenom: 'Awa', nom: 'Diop',
    dateNaissance: '2003-01-15',
    genre: 'F' as const,
    region: 'Tambacounda', commune: '',
  }

  test('submit appelle steps 1 + 2 onboarding API puis push', async () => {
    const { result } = renderHook(() => useProfilStep(initial))
    await act(async () => { await result.current.submit() })
    expect(onboardingCalls).toHaveLength(2)
    expect(onboardingCalls[0]?.step).toBe(1)
    expect(onboardingCalls[1]?.step).toBe(2)
    expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/centre-principal')
  })

  test('submit échoue si prénom trop court (validation Zod)', async () => {
    const { result } = renderHook(() => useProfilStep({ ...initial, prenom: 'A' }))
    await act(async () => { await result.current.submit() })
    expect(onboardingCalls).toHaveLength(0)
    expect(result.current.errors.prenom).toBeTruthy()
  })

  test('setGenre Autre n’est pas persisté en draft', async () => {
    const { result } = renderHook(() => useProfilStep(initial))
    await act(async () => { result.current.setGenre('Autre') })
    expect(result.current.genre).toBe('Autre')
  })
})

describe('useRecommandationsStep', () => {
  test('finalise appelle step 3 puis clear draft puis push', async () => {
    draftStore = {
      objectifs: ['agriculture', 'projet'],
      telephone: null, prenom: null, nom: null,
      dateNaissance: null, genre: null, region: null, commune: null,
      updatedAt: new Date().toISOString(),
    }
    const { result } = renderHook(() => useRecommandationsStep())
    await waitFor(() => expect(result.current.draft.objectifs).toEqual(['agriculture', 'projet']))
    await act(async () => { await result.current.finalise('/jeune/tableau-de-bord') })
    // GUIC-689 — l'ancienne attente verrouillait la valeur fautive
    // « Entrepreneuriat », absente de DOMAINES_INTERET : elle ne correspondait à
    // aucune puce du formulaire de profil et se perdait à la première
    // sauvegarde. « Lancer mon projet » est une INTENTION, pas un secteur.
    expect(onboardingCalls).toEqual([
      {
        step: 3,
        data: {
          domainesInteret: ['Agriculture'],
          typesRecherches: ['entrepreneuriat', 'financement'],
        },
      },
    ])
    expect(pushMock).toHaveBeenCalledWith('/jeune/tableau-de-bord')
    expect(draftStore).toBeNull()
  })
})
