/**
 * @jest-environment jsdom
 *
 * GUIC-431 — Flow onboarding 4 étapes (retrait téléphone + câblage centre-principal).
 *
 * RED commit : ces tests doivent échouer avant les modifications source.
 *
 * Cas couverts :
 * 1. useProfilStep : nextRoute par défaut → /jeune/onboarding/centre-principal
 * 2. OnboardingProfil (mobile) : StepBar step=2 total=4
 * 3. OnboardingObjectifs (mobile) : StepBar step=1 total=4
 * 4. OnboardingRecommandations (mobile) : StepBar step=4 total=4
 * 5. centre-principal-form : StepBar step=3 total=4
 * 6. useProfilStep submit redirige vers /jeune/onboarding/centre-principal
 * 7. OnboardingProfilWeb soumet et redirige vers centre-principal
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { OnboardingObjectifs } from '@/app/jeune/onboarding/_screens/OnboardingObjectifs'
import { OnboardingProfil } from '@/app/jeune/onboarding/_screens/OnboardingProfil'
import { OnboardingRecommandations } from '@/app/jeune/onboarding/_screens/OnboardingRecommandations'
import { CentrePrincipalForm } from '@/app/jeune/onboarding/centre-principal/centre-principal-form'
import { OnboardingProfilWeb } from '@/app/jeune/onboarding/_screens-web/OnboardingProfilWeb'
import {
  useProfilStep,
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
    if (u.startsWith('/api/profil/centre-principal')) {
      return jsonRes({ data: { ok: true } })
    }
    return jsonRes({}, 404)
  }) as unknown as typeof fetch
})

// ─── 1. useProfilStep — nextRoute par défaut = centre-principal ───────────────

describe('useProfilStep — GUIC-431 nextRoute par défaut', () => {
  const initial = {
    prenom: 'Awa', nom: 'Diop',
    dateNaissance: '2003-01-15',
    genre: 'F' as const,
    region: 'Tambacounda', commune: '',
  }

  test('submit sans nextRoute redirige vers /jeune/onboarding/centre-principal', async () => {
    const { result } = renderHook(() => useProfilStep(initial))
    await act(async () => { await result.current.submit() })
    expect(onboardingCalls).toHaveLength(2)
    expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/centre-principal')
  })
})

// ─── 2. OnboardingObjectifs — StepBar 1/4 ────────────────────────────────────

describe('OnboardingObjectifs — StepBar GUIC-431', () => {
  test('affiche StepBar step=1 total=4', () => {
    const { container } = render(<OnboardingObjectifs />)
    // Le StepBar rend un aria-label "Étape X / Y"
    const bar = container.querySelector('[aria-label]')
    // On cherche "1 / 4" ou "1/4" selon l'implémentation du StepBar
    const label = container.querySelector('[role="progressbar"]')
    if (label) {
      expect(label).toHaveAttribute('aria-valuenow', '1')
      expect(label).toHaveAttribute('aria-valuemax', '4')
    } else {
      // Fallback : on vérifie via le texte accessible ou un data-testid
      const stepText = container.querySelector('[data-step]')
      if (stepText) {
        expect(stepText).toHaveAttribute('data-step', '1')
        expect(stepText).toHaveAttribute('data-total', '4')
      } else {
        // On cherche le contenu textuel "1 / 4" dans le DOM
        expect(container.textContent).toMatch(/1\s*[/\/]\s*4/)
      }
    }
  })
})

// ─── 3. OnboardingProfil — StepBar 2/4 ───────────────────────────────────────

describe('OnboardingProfil — StepBar GUIC-431', () => {
  const initial = {
    prenom: '', nom: '', dateNaissance: '', genre: null as null,
    region: '', commune: '',
  }

  test('affiche StepBar step=2 total=4', () => {
    const { container } = render(<OnboardingProfil initial={initial} />)
    const label = container.querySelector('[role="progressbar"]')
    if (label) {
      expect(label).toHaveAttribute('aria-valuenow', '2')
      expect(label).toHaveAttribute('aria-valuemax', '4')
    } else {
      expect(container.textContent).toMatch(/2\s*[/\/]\s*4/)
    }
  })
})

// ─── 4. CentrePrincipalForm — StepBar 3/4 ────────────────────────────────────

describe('CentrePrincipalForm — StepBar GUIC-431', () => {
  const centres = [
    { id: 'c1', nom: 'CJS Dakar', region: 'Dakar', ville: 'Dakar' },
  ]

  test('affiche StepBar step=3 total=4', () => {
    const { container } = render(
      <CentrePrincipalForm centres={centres} suggestedId={null} userRegion={null} />
    )
    const label = container.querySelector('[role="progressbar"]')
    if (label) {
      expect(label).toHaveAttribute('aria-valuenow', '3')
      expect(label).toHaveAttribute('aria-valuemax', '4')
    } else {
      expect(container.textContent).toMatch(/3\s*[/\/]\s*4/)
    }
  })
})

// ─── 5. OnboardingRecommandations — StepBar 4/4 ───────────────────────────────

describe('OnboardingRecommandations — StepBar GUIC-431', () => {
  test('affiche StepBar step=4 total=4', () => {
    const { container } = render(<OnboardingRecommandations />)
    const label = container.querySelector('[role="progressbar"]')
    if (label) {
      expect(label).toHaveAttribute('aria-valuenow', '4')
      expect(label).toHaveAttribute('aria-valuemax', '4')
    } else {
      expect(container.textContent).toMatch(/4\s*[/\/]\s*4/)
    }
  })
})

// ─── 6. OnboardingProfil (mobile) — submit redirige vers centre-principal ─────

describe('OnboardingProfil — redirection vers centre-principal', () => {
  test('soumet et redirige vers /jeune/onboarding/centre-principal', async () => {
    render(<OnboardingProfil initial={{
      prenom: 'Awa', nom: 'Diop', dateNaissance: '2003-04-12',
      genre: 'F', region: 'Tambacounda', commune: '',
    }} />)
    fireEvent.click(screen.getByRole('button', { name: /^continuer/i }))
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/centre-principal')
    })
  })
})

// ─── 7. OnboardingProfilWeb — submit redirige vers centre-principal ───────────

describe('OnboardingProfilWeb — redirection vers centre-principal', () => {
  const initial = {
    prenom: 'Awa', nom: 'Diop',
    dateNaissance: '2003-01-15', genre: 'F' as const,
    region: 'Tambacounda', commune: '',
  }

  test('soumet et redirige vers /jeune/onboarding/centre-principal', async () => {
    render(<OnboardingProfilWeb initial={initial} />)
    fireEvent.click(screen.getByRole('button', { name: /^Continuer/i }))
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/centre-principal')
    })
  })
})
