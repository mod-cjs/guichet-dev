/**
 * GUIC-189 — Tests UI du flow de candidature multi-étapes.
 *
 * On mocke `@vercel/blob/client` pour ne jamais effectuer d'appel réseau
 * pendant les tests (l'upload est testé via mock-fetch).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CandidatureModal, type ViewerInfo } from '@/components/opportunites/CandidatureModal'

jest.mock('@vercel/blob/client', () => ({
  upload: jest.fn(async (name: string) => ({ url: `https://blob.test/${name}` })),
}))

const VIEWER_COMPLET: ViewerInfo = {
  prenom: 'Awa',
  nom: 'Diop',
  email: 'awa@example.org',
  telephone: '+221770000000',
}

const VIEWER_INCOMPLET: ViewerInfo = {
  prenom: 'Awa',
  nom: 'Diop',
  email: null,
  telephone: null,
}

const baseProps = {
  opportuniteId: '11111111-1111-4111-8111-111111111111',
  opportuniteTitre: 'Stage Data Science',
  isOpen: true,
  onClose: jest.fn(),
  onSuccess: jest.fn(),
}

describe('<CandidatureModal /> (GUIC-189)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn() as unknown as typeof fetch
  })

  it('étape 1 — désactive Continuer si profil incomplet (téléphone manquant)', () => {
    render(<CandidatureModal {...baseProps} viewer={VIEWER_INCOMPLET} />)
    const cta = screen.getByRole('button', { name: /Continuer/i })
    expect(cta).toBeDisabled()
    expect(screen.getByText(/Compléter mon profil/i)).toBeInTheDocument()
  })

  it('étape 1 → étape 2 : passe quand le profil est complet', () => {
    render(<CandidatureModal {...baseProps} viewer={VIEWER_COMPLET} />)
    fireEvent.click(screen.getByRole('button', { name: /Continuer/i }))
    // Étape 2 : la textarea lettre est visible
    expect(screen.getByLabelText(/Lettre de motivation/i)).toBeInTheDocument()
  })

  it('étape 2 — refuse de continuer si lettre < 300 caractères', () => {
    render(<CandidatureModal {...baseProps} viewer={VIEWER_COMPLET} />)
    fireEvent.click(screen.getByRole('button', { name: /Continuer/i }))
    const textarea = screen.getByLabelText(/Lettre de motivation/i)
    fireEvent.change(textarea, { target: { value: 'trop court' } })
    const cta = screen.getByRole('button', { name: /Continuer/i })
    expect(cta).toBeDisabled()
    expect(screen.getByText(/Minimum 300 caractères/i)).toBeInTheDocument()
  })

  it('flow complet — soumet la candidature et arrive à l’écran succès', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ status: 201, ok: true })

    render(<CandidatureModal {...baseProps} viewer={VIEWER_COMPLET} />)
    fireEvent.click(screen.getByRole('button', { name: /Continuer/i }))

    const textarea = screen.getByLabelText(/Lettre de motivation/i)
    fireEvent.change(textarea, { target: { value: 'x'.repeat(320) } })
    fireEvent.click(screen.getByRole('button', { name: /Continuer/i }))

    // Étape 3 — accepter les deux cases puis envoyer
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // notifs
    fireEvent.click(checkboxes[1]) // CGU
    fireEvent.click(screen.getByRole('button', { name: /Envoyer ma candidature/i }))

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Suivre ma candidature/i })).toBeInTheDocument(),
    )
    expect(baseProps.onSuccess).toHaveBeenCalled()

    // Vérifie le payload envoyé à l'API
    const call = (global.fetch as jest.Mock).mock.calls[0]
    expect(call[0]).toBe('/api/candidatures')
    const body = JSON.parse(call[1].body)
    expect(body).toMatchObject({
      opportuniteId: baseProps.opportuniteId,
      notificationsConsent: true,
    })
    expect(body.lettreMotivation.length).toBeGreaterThanOrEqual(300)
  })

  it('409 — affiche le message "déjà postulé"', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ status: 409, ok: false })

    render(<CandidatureModal {...baseProps} viewer={VIEWER_COMPLET} />)
    fireEvent.click(screen.getByRole('button', { name: /Continuer/i }))
    fireEvent.change(screen.getByLabelText(/Lettre de motivation/i), {
      target: { value: 'x'.repeat(320) },
    })
    fireEvent.click(screen.getByRole('button', { name: /Continuer/i }))
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[1])
    fireEvent.click(screen.getByRole('button', { name: /Envoyer ma candidature/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/déjà postulé/i),
    )
  })
})
