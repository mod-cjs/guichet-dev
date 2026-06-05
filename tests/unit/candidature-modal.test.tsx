/**
 * Tests <CandidatureModal /> — refonte v2 (GUIC-220).
 *
 * Couvre : single-sheet rendering, validation (CV, lettre, CGU), erreurs
 * réseau / 401 / 422 / 500, écran succès, a11y, garde-fou fermeture.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CandidatureModal, type ViewerInfo } from '@/components/opportunites/CandidatureModal'
import { LETTRE_MAX_CHARS, MAX_CV_BYTES } from '@/lib/constants/candidature'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: jest.fn() }),
}))

/**
 * Helper : installe un fetch mock qui répond {cvUrl:null} sur `/api/profil/cv`
 * (les tests existants attendent FileUpload) et délègue le reste à `inner`.
 * Retourne le mock interne (utile pour `expect(inner).toHaveBeenCalled()`).
 */
function installFetch(inner: jest.Mock): jest.Mock {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.startsWith('/api/profil/cv')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { cvUrl: null, name: '', uploadedAt: null } }),
      } as unknown as Response
    }
    // GUIC-232 — par défaut profil complet (les tests dédiés overrident).
    if (url.startsWith('/api/profil/completude')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { complet: true, missing: [] } }),
      } as unknown as Response
    }
    return inner(input, init)
  }) as unknown as typeof fetch
  return inner
}

const VIEWER: ViewerInfo = {
  prenom: 'Awa',
  nom: 'Diop',
  telephone: '+221776543210',
  age: 22,
  region: 'Tambacounda',
}

function fakeUploader() {
  return jest.fn(async (safeName: string) => ({
    url: 'https://blob.example/' + safeName,
    name: safeName,
    sizeKb: 12,
  }))
}

function renderModal(over: Partial<React.ComponentProps<typeof CandidatureModal>> = {}) {
  const props: React.ComponentProps<typeof CandidatureModal> = {
    opportuniteId: '550e8400-e29b-41d4-a716-446655440000',
    opportuniteTitre: 'Stage Data — Sonatel',
    viewer: VIEWER,
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
    organisationName: 'Sonatel',
    uploader: fakeUploader(),
    ...over,
  }
  return { props, ...render(<CandidatureModal {...props} />) }
}

function makePdf(name: string, sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'application/pdf' })
}

function pickFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  fireEvent.change(input)
}

async function typeLettre(value = 'Je postule parce que cette opportunité correspond à mon parcours.') {
  const ta = screen.getByLabelText(/Lettre de motivation/i) as HTMLTextAreaElement
  await act(async () => {
    fireEvent.change(ta, { target: { value } })
  })
  return ta
}

async function checkConsent() {
  const cb = screen.getByRole('checkbox') as HTMLInputElement
  await act(async () => {
    fireEvent.click(cb)
  })
  return cb
}

async function uploadCv(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  await act(async () => {
    pickFile(input, makePdf('cv.pdf'))
  })
  // GUIC-229 — mode `defer` : on affiche le fichier sélectionné, mais
  // aucun upload réseau n'a encore eu lieu (il aura lieu au submit).
  await waitFor(() => expect(screen.getByText(/chargé : cv\.pdf/i)).toBeInTheDocument())
}

/**
 * Helper : enveloppe une `fetch` mock pour que tout appel à
 * `/api/profil/completude` retourne un profil complet par défaut. Les autres
 * URLs sont déléguées à la fonction passée. Ainsi les tests existants n'ont
 * pas à mocker explicitement la complétude (GUIC-232).
 */
function withCompletudeOk(
  inner: (url: string, init?: RequestInit) => Promise<Response>,
  missing: string[] = [],
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/api/profil/completude')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { complet: missing.length === 0, missing } }),
      } as unknown as Response
    }
    return inner(url, init)
  }) as unknown as typeof fetch
}

describe('<CandidatureModal /> — refonte v2', () => {
  const originalFetch = global.fetch
  const originalConfirm = window.confirm

  beforeEach(() => {
    pushMock.mockReset()
    // Par défaut : /api/profil/cv → {cvUrl:null} (flux FileUpload), /api/profil/completude
    // → profil complet (cf installFetch), autres routes neutres 500. Les tests overrident.
    installFetch(
      jest.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response),
    )
  })

  afterEach(() => {
    global.fetch = originalFetch
    window.confirm = originalConfirm
    jest.restoreAllMocks()
  })

  it('rend un dialog accessible (single sheet, pas de stepper)', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    // Pas d'élément stepper
    expect(screen.queryByText(/Étape \d/i)).not.toBeInTheDocument()
    // Bandeau pré-rempli
    expect(screen.getByText(/Pré-rempli depuis ton profil/i)).toBeInTheDocument()
    // Carte profil
    expect(screen.getByText(/Awa Diop · 22 ans/)).toBeInTheDocument()
    expect(screen.getByText(/Tambacounda/)).toBeInTheDocument()
  })

  it('a11y : textarea a aria-required, aria-describedby pointant helper+compteur', () => {
    renderModal()
    const ta = screen.getByLabelText(/Lettre de motivation/i)
    expect(ta).toHaveAttribute('aria-required', 'true')
    const describedBy = ta.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const ids = describedBy!.split(' ')
    expect(ids.length).toBeGreaterThanOrEqual(2)
    // Le compteur est `aria-live="polite"` et présent dans le DOM
    const live = document.querySelector('[aria-live="polite"]')
    expect(live).not.toBeNull()
  })

  it('tronque la lettre à LETTRE_MAX_CHARS', async () => {
    renderModal()
    const longText = 'x'.repeat(LETTRE_MAX_CHARS + 250)
    const ta = await typeLettre(longText)
    expect(ta.value).toHaveLength(LETTRE_MAX_CHARS)
    expect(screen.getByText(new RegExp(`${LETTRE_MAX_CHARS} / ${LETTRE_MAX_CHARS}`))).toBeInTheDocument()
  })

  it('bouton "Envoyer" disabled tant que lettre + CGU manquantes', () => {
    renderModal()
    const btn = screen.getByRole('button', { name: /Envoyer ma candidature/i })
    expect(btn).toBeDisabled()
  })

  it('CGU non cochée → submit reste disabled', async () => {
    renderModal()
    await typeLettre()
    const btn = screen.getByRole('button', { name: /Envoyer ma candidature/i })
    expect(btn).toBeDisabled()
  })

  it('CV manquant quand requiresFileUpload=true → submit disabled', async () => {
    renderModal({ requiresFileUpload: true })
    await typeLettre()
    await checkConsent()
    const btn = screen.getByRole('button', { name: /Envoyer ma candidature/i })
    expect(btn).toBeDisabled()
  })

  it('rejette les MIME non-PDF (upload côté UI)', async () => {
    const { container } = renderModal()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const txt = new File([new Uint8Array(10)], 'cv.txt', { type: 'text/plain' })
    await act(async () => {
      pickFile(input, txt)
    })
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Format non supporté/i),
    )
  })

  it('rejette les fichiers > MAX_CV_BYTES', async () => {
    const { container } = renderModal()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const big = makePdf('big.pdf', MAX_CV_BYTES + 1)
    await act(async () => {
      pickFile(input, big)
    })
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/trop volumineux/i),
    )
  })

  it('upload échec réseau au submit → message d’erreur (mode defer GUIC-229)', async () => {
    const uploader = jest.fn(async () => {
      throw new Error('Network down')
    })
    const { container } = renderModal({ uploader })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      pickFile(input, makePdf('cv.pdf'))
    })
    // En mode defer, la sélection ne déclenche AUCUN upload.
    expect(uploader).not.toHaveBeenCalled()
    await typeLettre()
    await checkConsent()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Envoyer ma candidature/i }))
    })
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Network down/i),
    )
    // L'uploader a été appelé une seule fois (et a échoué).
    expect(uploader).toHaveBeenCalledTimes(1)
  })

  it('GUIC-229 — 3 changements de fichier avant submit → 0 upload réseau', async () => {
    const uploader = fakeUploader()
    const { container } = renderModal({ uploader })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      pickFile(input, makePdf('first.pdf'))
    })
    await act(async () => {
      pickFile(input, makePdf('second.pdf'))
    })
    await act(async () => {
      pickFile(input, makePdf('third.pdf'))
    })
    // Trois sélections, zéro blob créé : c'est précisément le bug fixé.
    expect(uploader).not.toHaveBeenCalled()
  })

  it('GUIC-229 — fermeture sans submit ne déclenche aucun upload', async () => {
    const uploader = fakeUploader()
    window.confirm = jest.fn().mockReturnValue(true) as unknown as typeof window.confirm
    const onClose = jest.fn()
    const { container } = renderModal({ uploader, onClose })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      pickFile(input, makePdf('cv.pdf'))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Fermer/i }))
    })
    expect(onClose).toHaveBeenCalled()
    expect(uploader).not.toHaveBeenCalled()
  })

  it('GUIC-229 — submit upload une seule fois puis POST /api/candidatures', async () => {
    const uploader = fakeUploader()
    const fetchMock = jest.fn(async () => ({
      status: 201,
      ok: true,
      json: async () => ({ data: { id: '11111111-2222-3333-4444-555555555555' } }),
    })) as unknown as typeof fetch
    global.fetch = fetchMock
    const { container } = renderModal({ uploader })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    // Trois changements avant le submit
    await act(async () => {
      pickFile(input, makePdf('first.pdf'))
    })
    await act(async () => {
      pickFile(input, makePdf('second.pdf'))
    })
    await act(async () => {
      pickFile(input, makePdf('third.pdf'))
    })
    await typeLettre()
    await checkConsent()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Envoyer ma candidature/i }))
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    // 1 seul upload pour les 3 sélections — le fichier final.
    expect(uploader).toHaveBeenCalledTimes(1)
    expect(uploader.mock.calls[0][0]).toBe('third.pdf')
  })

  it('submission 201 → écran succès rendu + onSuccess() appelé', async () => {
    const fetchMock = jest.fn(async () =>
      ({
        status: 201,
        ok: true,
        json: async () => ({ data: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' } }),
      }) as unknown as Response,
    )
    installFetch(fetchMock)
    const { props } = renderModal()
    await typeLettre()
    await checkConsent()
    const btn = screen.getByRole('button', { name: /Envoyer ma candidature/i })
    expect(btn).not.toBeDisabled()
    await act(async () => {
      fireEvent.click(btn)
    })
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
    expect(
      await screen.findByRole('heading', { name: /Candidature envoyée 🎉/i, level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('candidature-ref').textContent).toMatch(/^CAND-[A-F0-9]{8}$/)
  })

  it('submission 500 → message d’erreur générique', async () => {
    installFetch(jest.fn(async () => ({ status: 500, ok: false, json: async () => ({}) }) as unknown as Response))
    renderModal()
    await typeLettre()
    await checkConsent()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Envoyer ma candidature/i }))
    })
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Une erreur est survenue/i),
    )
  })

  it('422 deadline expirée → message dédié', async () => {
    installFetch(jest.fn(async () => ({ status: 422, ok: false, json: async () => ({}) }) as unknown as Response))
    renderModal()
    await typeLettre()
    await checkConsent()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Envoyer ma candidature/i }))
    })
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/n'accepte plus de candidatures/i),
    )
  })

  it('401 session expirée → message dédié', async () => {
    installFetch(jest.fn(async () => ({ status: 401, ok: false, json: async () => ({}) }) as unknown as Response))
    renderModal()
    await typeLettre()
    await checkConsent()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Envoyer ma candidature/i }))
    })
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/session a expiré/i),
    )
  })

  it('network error catch → message générique de connexion', async () => {
    installFetch(
      jest.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    renderModal()
    await typeLettre()
    await checkConsent()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Envoyer ma candidature/i }))
    })
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Connexion impossible/i),
    )
  })

  it('fermeture mid-flow avec lettre saisie → confirm natif', async () => {
    const confirmMock = jest.fn().mockReturnValue(false)
    window.confirm = confirmMock as unknown as typeof window.confirm
    const onClose = jest.fn()
    renderModal({ onClose })
    await typeLettre('Quelques mots tapés.')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Fermer/i }))
    })
    expect(confirmMock).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Yaye m\'aide → router.push vers /jeune/yaye avec slug opportunité', async () => {
    renderModal({ opportuniteSlug: 'stage-data-sonatel' })
    const btn = screen.getByTestId('yaye-help-button')
    await act(async () => {
      fireEvent.click(btn)
    })
    expect(pushMock).toHaveBeenCalledWith(
      '/jeune/yaye?from=postuler&opp=stage-data-sonatel',
    )
  })

  it('Yaye m\'aide → fallback sans slug si la prop n\'est pas fournie', async () => {
    renderModal()
    const btn = screen.getByTestId('yaye-help-button')
    await act(async () => {
      fireEvent.click(btn)
    })
    expect(pushMock).toHaveBeenCalledWith('/jeune/yaye?from=postuler')
  })

  it('lien "Modifier dans mon profil" pointe vers /jeune/mon-profil', () => {
    renderModal()
    const link = screen.getByTestId('edit-profile-link') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/jeune/mon-profil')
  })

  it('CV profil absent → FileUpload direct (pas de carte "Utiliser ce CV")', async () => {
    const { container } = renderModal()
    // Attend la résolution du fetch /api/profil/cv (réponse {cvUrl:null}).
    await waitFor(() => {
      expect(container.querySelector('input[type="file"]')).not.toBeNull()
    })
    expect(screen.queryByTestId('profile-cv-card')).not.toBeInTheDocument()
  })

  it('CV profil disponible → carte "Utiliser mon CV de profil" affichée', async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.startsWith('/api/profil/cv')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              cvUrl: 'https://blob.example/cv-awa-diop.pdf',
              name: '',
              uploadedAt: '2026-05-12T08:00:00.000Z',
            },
          }),
        } as unknown as Response
      }
      return { ok: false, status: 500, json: async () => ({}) } as unknown as Response
    }) as unknown as typeof fetch

    renderModal()
    expect(await screen.findByTestId('profile-cv-card')).toBeInTheDocument()
    expect(screen.getByText(/cv-awa-diop\.pdf/i)).toBeInTheDocument()
    expect(screen.getByText(/Ajouté le 12 mai 2026/i)).toBeInTheDocument()
    // Le FileUpload n'est PAS rendu en mode 'profile'.
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })

  it('bouton "Utiliser ce CV" → state cv set + soumission envoie cvUrl du profil', async () => {
    let candidaturesPayload: unknown = null
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.startsWith('/api/profil/cv')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              cvUrl: 'https://blob.example/cv-profil.pdf',
              name: '',
              uploadedAt: '2026-05-12T08:00:00.000Z',
            },
          }),
        } as unknown as Response
      }
      if (url.startsWith('/api/candidatures')) {
        candidaturesPayload = init?.body ? JSON.parse(init.body as string) : null
        return {
          ok: true,
          status: 201,
          json: async () => ({ data: { id: '99999999-aaaa-bbbb-cccc-dddddddddddd' } }),
        } as unknown as Response
      }
      return { ok: false, status: 500, json: async () => ({}) } as unknown as Response
    }) as unknown as typeof fetch

    renderModal({ requiresFileUpload: true })
    const useBtn = await screen.findByTestId('use-profile-cv-button')
    await act(async () => {
      fireEvent.click(useBtn)
    })
    expect(await screen.findByTestId('profile-cv-selected')).toBeInTheDocument()
    await typeLettre()
    await checkConsent()
    const submitBtn = screen.getByRole('button', { name: /Envoyer ma candidature/i })
    expect(submitBtn).not.toBeDisabled()
    await act(async () => {
      fireEvent.click(submitBtn)
    })
    await waitFor(() => expect(candidaturesPayload).not.toBeNull())
    expect((candidaturesPayload as { cvUrl?: string }).cvUrl).toBe(
      'https://blob.example/cv-profil.pdf',
    )
  })

  it('"Charger un nouveau CV" → bascule sur FileUpload', async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.startsWith('/api/profil/cv')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              cvUrl: 'https://blob.example/cv-profil.pdf',
              name: '',
              uploadedAt: null,
            },
          }),
        } as unknown as Response
      }
      return { ok: false, status: 500, json: async () => ({}) } as unknown as Response
    }) as unknown as typeof fetch

    renderModal()
    const newBtn = await screen.findByTestId('upload-new-cv-button')
    await act(async () => {
      fireEvent.click(newBtn)
    })
    await waitFor(() => {
      expect(document.querySelector('input[type="file"]')).not.toBeNull()
    })
    expect(screen.queryByTestId('profile-cv-card')).not.toBeInTheDocument()
  })

  it('upload réussi + soumission 201 envoie cvUrl dans le payload', async () => {
    const innerMock = jest.fn(async (_url: string, _init?: RequestInit) => ({
      status: 201, ok: true,
      json: async () => ({ data: { id: '11111111-2222-3333-4444-555555555555' } }),
    }) as unknown as Response)
    installFetch(innerMock)
    const { container } = renderModal()
    await uploadCv(container)
    await typeLettre()
    await checkConsent()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Envoyer ma candidature/i }))
    })
    await waitFor(() => expect(innerMock).toHaveBeenCalled())
    const callBody = JSON.parse(innerMock.mock.calls[0][1]!.body as string)
    expect(callBody.cvUrl).toMatch(/^https:\/\/blob\.example\//)
    expect(callBody.notificationsConsent).toBe(true)
  })

  it('GUIC-232 — profil incomplet : bandeau + bouton désactivé', async () => {
    global.fetch = withCompletudeOk(
      async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response,
      ['region', 'niveauEtude', 'domainesInteret'],
    )
    renderModal()
    expect(await screen.findByTestId('profil-incomplet-banner')).toBeInTheDocument()
    expect(screen.getByText(/région/)).toBeInTheDocument()
    expect(screen.getByText(/Compléter mon profil/i)).toBeInTheDocument()
    // Même après lettre + CGU, le bouton reste désactivé.
    await typeLettre()
    await checkConsent()
    expect(
      screen.getByRole('button', { name: /Envoyer ma candidature/i }),
    ).toBeDisabled()
  })
})
