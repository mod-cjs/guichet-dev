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

// Lettre par défaut > LETTRE_MIN_CHARS (300) pour que le bouton "Envoyer" soit actif.
const LETTRE_DEFAUT =
  "Je souhaite postuler à cette opportunité car elle correspond parfaitement à mon parcours et à mes aspirations professionnelles. " +
  "Fort de mon expérience et de mes compétences acquises, je suis convaincu de pouvoir apporter une réelle valeur ajoutée à votre organisation. " +
  "Mon profil, axé sur le développement et la collaboration, me permettra de m'intégrer rapidement et d'être opérationnel dès le premier jour."

async function typeLettre(value = LETTRE_DEFAUT) {
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
    // Bandeau pré-rempli (texte v2 — GUIC-380)
    expect(screen.getByText(/Tu candidates avec les infos de ton profil/i)).toBeInTheDocument()
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

  // GUIC-689 — CTA de conversion magenta.
  it('le CTA "Envoyer ma candidature" porte la couleur d\'action de conversion (classe .gj-cta)', async () => {
    renderModal()
    await typeLettre()
    await checkConsent()
    const btn = screen.getByRole('button', { name: /Envoyer ma candidature/i })
    expect(btn.className).toMatch(/\bgj-cta\b/)
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
    // Le titre de la modale et le heading de l'écran succès portent tous deux le
    // libellé « Candidature envoyée » ; l'emoji (aria-hidden) n'est plus dans le nom
    // accessible — on cible le heading succès via son contenu textuel.
    const headings = await screen.findAllByRole('heading', {
      name: /Candidature envoyée/i,
      level: 2,
    })
    expect(headings.some((h) => h.textContent?.includes('🎉'))).toBe(true)
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

  // ── GUIC-689 (P3-B) — assistance Yaye INLINE (POST /api/ia), plus de
  // navigation qui ferait quitter le formulaire en pleine saisie.
  describe('Yaye m\'aide — assistance inline', () => {
    function installIaFetch(
      body: unknown = { data: { reply: 'Lettre générée par Yaye pour cette offre.' } },
      opts: { ok?: boolean; status?: number } = {},
    ) {
      const { ok = true, status = 200 } = opts
      const spy = jest.fn()
      installFetch(
        jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === 'string' ? input : input.toString()
          if (url.startsWith('/api/ia')) {
            spy(url, init)
            return { ok, status, json: async () => body } as unknown as Response
          }
          return { ok: true, status: 200, json: async () => ({ data: {} }) } as unknown as Response
        }),
      )
      return spy
    }

    it('ne navigue plus jamais — reste dans le formulaire (pas de router.push)', async () => {
      installIaFetch()
      renderModal()
      const btn = screen.getByTestId('yaye-help-button')
      await act(async () => {
        fireEvent.click(btn)
      })
      await waitFor(() => expect(btn).not.toBeDisabled())
      expect(pushMock).not.toHaveBeenCalled()
    })

    it('appelle POST /api/ia avec le contexte de l’offre et pré-remplit la lettre vide', async () => {
      const spy = installIaFetch({ data: { reply: 'Lettre générée par Yaye pour cette offre.' } })
      renderModal({ opportuniteTitre: 'Stage Data — Sonatel', organisationName: 'Sonatel' })
      const btn = screen.getByTestId('yaye-help-button')
      await act(async () => {
        fireEvent.click(btn)
      })
      await waitFor(() => {
        expect(screen.getByLabelText(/Lettre de motivation/i)).toHaveValue(
          'Lettre générée par Yaye pour cette offre.',
        )
      })
      expect(spy).toHaveBeenCalledWith('/api/ia', expect.anything())
      const [, init] = spy.mock.calls[0] as [string, RequestInit]
      expect(init.method).toBe('POST')
      const payload = JSON.parse(init.body as string) as { message: string }
      expect(payload.message).toMatch(/Stage Data — Sonatel/)
      expect(payload.message).toMatch(/Sonatel/)
    })

    it('lettre déjà saisie → le texte généré est ajouté à la suite, jamais en écrasant', async () => {
      installIaFetch({ data: { reply: 'Complément généré par Yaye.' } })
      renderModal()
      await typeLettre('Ce que j’ai déjà écrit à la main.')
      const btn = screen.getByTestId('yaye-help-button')
      await act(async () => {
        fireEvent.click(btn)
      })
      await waitFor(() => {
        const ta = screen.getByLabelText(/Lettre de motivation/i) as HTMLTextAreaElement
        expect(ta.value).toContain('Ce que j’ai déjà écrit à la main.')
        expect(ta.value).toContain('Complément généré par Yaye.')
      })
    })

    it('pendant la génération, le bouton affiche un état de chargement et est désactivé', async () => {
      let resolveFetch: (value: unknown) => void = () => {}
      const pending = new Promise((resolve) => {
        resolveFetch = resolve
      })
      installFetch(
        jest.fn(async (input: RequestInfo | URL) => {
          const url = typeof input === 'string' ? input : input.toString()
          if (url.startsWith('/api/ia')) return pending as unknown as Promise<Response>
          return { ok: true, status: 200, json: async () => ({ data: {} }) } as unknown as Response
        }),
      )
      renderModal()
      const btn = screen.getByTestId('yaye-help-button')
      fireEvent.click(btn)
      await waitFor(() => expect(btn).toBeDisabled())
      await act(async () => {
        resolveFetch({ ok: true, status: 200, json: async () => ({ data: { reply: 'Texte.' } }) })
        await pending
      })
      await waitFor(() => expect(btn).not.toBeDisabled())
    })

    it('échec réseau → message d’erreur honnête, la lettre déjà saisie reste intacte', async () => {
      installFetch(
        jest.fn(async (input: RequestInfo | URL) => {
          const url = typeof input === 'string' ? input : input.toString()
          if (url.startsWith('/api/ia')) throw new TypeError('Failed to fetch')
          return { ok: true, status: 200, json: async () => ({ data: {} }) } as unknown as Response
        }),
      )
      renderModal()
      await typeLettre('Mon brouillon perso.')
      const btn = screen.getByTestId('yaye-help-button')
      await act(async () => {
        fireEvent.click(btn)
      })
      await waitFor(() => {
        expect(screen.getByTestId('yaye-help-error')).toBeInTheDocument()
      })
      expect((screen.getByLabelText(/Lettre de motivation/i) as HTMLTextAreaElement).value).toBe(
        'Mon brouillon perso.',
      )
    })

    it('réponse HTTP en échec (500) → message d’erreur, lettre non vidée', async () => {
      installIaFetch({ error: { message: 'boom' } }, { ok: false, status: 500 })
      renderModal()
      await typeLettre('Texte conservé.')
      const btn = screen.getByTestId('yaye-help-button')
      await act(async () => {
        fireEvent.click(btn)
      })
      await waitFor(() => {
        expect(screen.getByTestId('yaye-help-error')).toBeInTheDocument()
      })
      expect((screen.getByLabelText(/Lettre de motivation/i) as HTMLTextAreaElement).value).toBe(
        'Texte conservé.',
      )
    })
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
      // Intercept uniquement le POST /api/candidatures (pas les drafts PUT/GET/DELETE).
      if (url === '/api/candidatures' && (init as RequestInit | undefined)?.method === 'POST') {
        candidaturesPayload = init?.body ? JSON.parse(init.body as string) : null
        return {
          ok: true,
          status: 201,
          json: async () => ({ data: { id: '99999999-aaaa-bbbb-cccc-dddddddddddd' } }),
        } as unknown as Response
      }
      // Draft endpoints (GET/PUT/DELETE) : retourne une réponse vide (non-ok) pour éviter
      // que le composant croit avoir restauré un brouillon avec des valeurs parasites.
      return { ok: false, status: 404, json: async () => ({}) } as unknown as Response
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
    // Cherche l'appel POST /api/candidatures parmi tous les appels (le GET drafts est aussi capturé).
    const candidaturesCall = (innerMock.mock.calls as [string, RequestInit?][]).find(
      ([url, init]) => url === '/api/candidatures' && (init as RequestInit | undefined)?.method === 'POST',
    )
    expect(candidaturesCall).toBeDefined()
    const callBody = JSON.parse((candidaturesCall![1] as RequestInit).body as string)
    expect(callBody.cvUrl).toMatch(/^https:\/\/blob\.example\//)
    expect(callBody.notificationsConsent).toBe(true)
  })

  it('GUIC-232 / GUIC-380 — profil incomplet : 403 PROFILE_INCOMPLETE → ferme modale et redirige', async () => {
    // Le bandeau frontal "profil-incomplet-banner" a été supprimé (GUIC-380) :
    // le POST /api/candidatures retourne 403 + code PROFILE_INCOMPLETE,
    // et le composant ferme la modale puis route vers /jeune/candidature/profil-incomplet.
    const missingFields = ['region', 'niveauEtude', 'domainesInteret']
    installFetch(
      jest.fn(async (url: string) => {
        if (url === '/api/candidatures') {
          return {
            ok: false,
            status: 403,
            json: async () => ({
              error: { code: 'PROFILE_INCOMPLETE', missing: missingFields },
            }),
          } as unknown as Response
        }
        return { ok: false, status: 500, json: async () => ({}) } as unknown as Response
      }),
    )
    const onClose = jest.fn()
    renderModal({ onClose })
    await typeLettre()
    await checkConsent()
    const btn = screen.getByRole('button', { name: /Envoyer ma candidature/i })
    expect(btn).not.toBeDisabled()
    await act(async () => {
      fireEvent.click(btn)
    })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    // Redirection vers la page intermédiaire avec les champs manquants en querystring.
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining('/jeune/candidature/profil-incomplet'),
    )
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining('opp=550e8400-e29b-41d4-a716-446655440000'),
    )
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining('missing=region'),
    )
  })

  // GUIC-419 — bouton « Brouillon » dans le footer : sauvegarde explicite + ferme.
  describe('GUIC-419 — bouton Brouillon', () => {
    it('rend un bouton "Brouillon" distinct du CTA principal', () => {
      renderModal()
      const draftBtn = screen.getByRole('button', { name: /^Brouillon$/i })
      expect(draftBtn).toBeInTheDocument()
      // Doit être distinct du CTA "Envoyer ma candidature".
      const submitBtn = screen.getByRole('button', { name: /Envoyer ma candidature/i })
      expect(draftBtn).not.toBe(submitBtn)
    })

    it('cliquer sur "Brouillon" PUT le draft serveur et ferme le modal sans poster la candidature', async () => {
      const innerMock = jest.fn(async () => {
        // Toute requête (PUT draft inclus) → 200 OK pour simplifier.
        return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
      })
      installFetch(innerMock)
      const { props } = renderModal()
      // L'utilisateur tape quelque chose puis clique Brouillon.
      await typeLettre('Je voulais finir plus tard…')
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Brouillon$/i }))
      })
      // onClose appelé immédiatement (le PUT est best-effort en void).
      expect(props.onClose).toHaveBeenCalled()
      // PUT /api/candidatures/drafts/<id> déclenché par le click (best-effort).
      const calls = innerMock.mock.calls as unknown as Array<[string | URL, RequestInit?]>
      const draftCall = calls.find(([url, init]) => {
        const u = typeof url === 'string' ? url : url.toString()
        return (
          u.includes('/api/candidatures/drafts/') &&
          (init as RequestInit | undefined)?.method === 'PUT'
        )
      })
      expect(draftCall).toBeDefined()
      const body = JSON.parse((draftCall![1] as RequestInit).body as string)
      expect(body.lettre).toMatch(/finir plus tard/)
      // Pas de POST /api/candidatures : la candidature n'est pas soumise.
      const submitCall = calls.find(([url, init]) => {
        const u = typeof url === 'string' ? url : url.toString()
        return u === '/api/candidatures' && (init as RequestInit | undefined)?.method === 'POST'
      })
      expect(submitCall).toBeUndefined()
    }, 20000)

    it('bouton Brouillon reste actif même si la lettre est trop courte / CGU non coché', () => {
      renderModal()
      const draftBtn = screen.getByRole('button', { name: /^Brouillon$/i })
      expect(draftBtn).not.toBeDisabled()
    })
  })
})
