/**
 * Tests <CandidatureModal /> — auto-fill complet (GUIC-361).
 *
 * Couvre :
 *  - pré-remplissage des champs email, téléphone, niveau d'études, situation
 *  - affichage des compétences issues du profil sous forme de chips
 *  - hint "ajoute ton CV au profil" si pas de CV au profil
 *  - envoi du payload avec `formulaireData` au POST
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CandidatureModal, type ViewerInfo } from '@/components/opportunites/CandidatureModal'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

const VIEWER_COMPLET: ViewerInfo = {
  prenom: 'Awa',
  nom: 'Diop',
  telephone: '+221776543210',
  age: 22,
  region: 'Tambacounda',
  email: 'awa.diop@example.sn',
  niveauEtude: 'Bac+3',
  situationEmploi: 'Étudiante',
  biographie: 'Passionnée par la data.',
  competences: ['JavaScript', 'Python', 'SQL'],
  domainesInteret: ['Numérique', 'Éducation'],
  photoUrl: null,
}

function installFetch(extra?: (url: string) => Response | null) {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const overridden = extra?.(url)
    if (overridden) return overridden
    if (url.startsWith('/api/profil/cv')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { cvUrl: null, name: '', uploadedAt: null } }),
      } as unknown as Response
    }
    if (url.startsWith('/api/profil/completude')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { complet: true, missing: [] } }),
      } as unknown as Response
    }
    return { ok: false, status: 500, json: async () => ({}) } as unknown as Response
  }) as unknown as typeof fetch
}

function renderModal(viewer: ViewerInfo = VIEWER_COMPLET) {
  return render(
    <CandidatureModal
      opportuniteId="550e8400-e29b-41d4-a716-446655440000"
      opportuniteTitre="Stage Data — Sonatel"
      viewer={viewer}
      isOpen
      onClose={jest.fn()}
      onSuccess={jest.fn()}
      organisationName="Sonatel"
    />,
  )
}

describe('<CandidatureModal /> auto-fill (GUIC-361)', () => {
  const originalFetch = global.fetch
  beforeEach(() => installFetch())
  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('pré-remplit email, téléphone, niveau d’études et situation depuis le profil', () => {
    renderModal()
    expect(screen.getByTestId('candidature-email')).toHaveValue('awa.diop@example.sn')
    expect(screen.getByTestId('candidature-telephone')).toHaveValue('+221776543210')
    expect(screen.getByTestId('candidature-niveau-etude')).toHaveValue('Bac+3')
    expect(screen.getByTestId('candidature-situation')).toHaveValue('Étudiante')
  })

  it('affiche les compétences du profil comme chips', () => {
    renderModal()
    const chips = screen.getAllByTestId('competence-chip')
    expect(chips).toHaveLength(3)
    expect(chips[0]).toHaveTextContent('JavaScript')
    expect(chips[2]).toHaveTextContent('SQL')
  })

  it('affiche le hint « ajoute ton CV au profil » quand aucun CV n’est sur le profil', async () => {
    renderModal()
    await waitFor(() =>
      expect(screen.getByTestId('no-profile-cv-hint')).toBeInTheDocument(),
    )
  })

  it('ne montre pas la section compétences quand le profil n’en a pas', () => {
    renderModal({ ...VIEWER_COMPLET, competences: [] })
    expect(screen.queryByTestId('competences-section')).not.toBeInTheDocument()
  })

  it('envoie formulaireData dans le payload POST', async () => {
    const captured: Array<{ url: string; body: unknown }> = []
    installFetch((url) => {
      if (url === '/api/candidatures') {
        return null // laisse passer via fallback custom plus bas
      }
      return null
    })
    // Override fetch pour capturer le POST candidatures
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.startsWith('/api/profil/cv')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { cvUrl: null, name: '', uploadedAt: null } }),
        } as unknown as Response
      }
      if (url.startsWith('/api/profil/completude')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { complet: true, missing: [] } }),
        } as unknown as Response
      }
      if (url === '/api/candidatures' && init?.method === 'POST') {
        captured.push({ url, body: JSON.parse(init.body as string) })
        return {
          ok: true,
          status: 201,
          json: async () => ({ data: { id: 'cand-1' } }),
        } as unknown as Response
      }
      return { ok: false, status: 500, json: async () => ({}) } as unknown as Response
    }) as unknown as typeof fetch

    renderModal()
    const ta = screen.getByLabelText(/Lettre de motivation/i)
    await act(async () => {
      fireEvent.change(ta, {
        target: { value: 'Je postule à cette opportunité avec enthousiasme.' },
      })
    })
    const checkbox = screen.getByRole('checkbox')
    await act(async () => {
      fireEvent.click(checkbox)
    })
    const submitBtn = screen.getByRole('button', { name: /Envoyer ma candidature/i })
    await waitFor(() => expect(submitBtn).not.toBeDisabled())
    await act(async () => {
      fireEvent.click(submitBtn)
    })

    await waitFor(() => expect(captured).toHaveLength(1))
    const body = captured[0]!.body as {
      formulaireData?: {
        email?: string | null
        niveauEtude?: string | null
        competences?: string[]
      }
    }
    expect(body.formulaireData?.email).toBe('awa.diop@example.sn')
    expect(body.formulaireData?.niveauEtude).toBe('Bac+3')
    expect(body.formulaireData?.competences).toEqual(['JavaScript', 'Python', 'SQL'])
  })
})
