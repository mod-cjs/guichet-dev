/**
 * Tests <CandidatureModal /> — refonte v2 (GUIC-220).
 *
 * Couvre : single-sheet rendering, validation (CV, lettre, CGU), erreurs
 * réseau / 401 / 422 / 500, écran succès, a11y, garde-fou fermeture.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CandidatureModal, type ViewerInfo } from '@/components/opportunites/CandidatureModal'
import { LETTRE_MAX_CHARS, MAX_CV_BYTES } from '@/lib/constants/candidature'

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
  await waitFor(() => expect(screen.getByText(/chargé : cv\.pdf/i)).toBeInTheDocument())
}

describe('<CandidatureModal /> — refonte v2', () => {
  const originalFetch = global.fetch
  const originalConfirm = window.confirm

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

  it('upload échec réseau → message d’erreur dans la zone CV', async () => {
    const uploader = jest.fn(async () => {
      throw new Error('Network down')
    })
    const { container } = renderModal({ uploader })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      pickFile(input, makePdf('cv.pdf'))
    })
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Network down/i),
    )
  })

  it('submission 201 → écran succès rendu + onSuccess() appelé', async () => {
    const fetchMock = jest.fn(async () =>
      ({
        status: 201,
        ok: true,
        json: async () => ({ data: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' } }),
      }) as unknown as Response,
    )
    global.fetch = fetchMock as unknown as typeof fetch
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
    global.fetch = jest.fn(async () => ({ status: 500, ok: false, json: async () => ({}) })) as unknown as typeof fetch
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
    global.fetch = jest.fn(async () => ({ status: 422, ok: false, json: async () => ({}) })) as unknown as typeof fetch
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
    global.fetch = jest.fn(async () => ({ status: 401, ok: false, json: async () => ({}) })) as unknown as typeof fetch
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
    global.fetch = jest.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
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

  it('Yaye m\'aide pré-remplit la lettre vide (mock)', async () => {
    renderModal()
    const btn = screen.getByRole('button', { name: /Yaye m'aide/i })
    await act(async () => {
      fireEvent.click(btn)
    })
    const ta = screen.getByLabelText(/Lettre de motivation/i) as HTMLTextAreaElement
    expect(ta.value.length).toBeGreaterThan(0)
  })

  it('upload réussi + soumission 201 envoie cvUrl dans le payload', async () => {
    const fetchMock = jest.fn(async () => ({
      status: 201, ok: true,
      json: async () => ({ data: { id: '11111111-2222-3333-4444-555555555555' } }),
    })) as unknown as typeof fetch
    global.fetch = fetchMock
    const { container } = renderModal()
    await uploadCv(container)
    await typeLettre()
    await checkConsent()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Envoyer ma candidature/i }))
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const callBody = JSON.parse(
      (fetchMock as unknown as jest.Mock).mock.calls[0][1].body as string,
    )
    expect(callBody.cvUrl).toMatch(/^https:\/\/blob\.example\//)
    expect(callBody.notificationsConsent).toBe(true)
  })
})
