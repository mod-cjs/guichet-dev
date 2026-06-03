/**
 * GUIC-223 — Tests UI CandidatureModal pour la section "CV depuis profil".
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CandidatureModal, type ViewerInfo } from '@/components/opportunites/CandidatureModal'

const VIEWER: ViewerInfo = { prenom: 'Awa', nom: 'Diop', telephone: '+221770000000' }

function mockFetchCv(payload: { cvUrl: string | null; uploadedAt?: string | null; name?: string }) {
  global.fetch = jest.fn(async (url: RequestInfo | URL) => {
    if (String(url).includes('/api/profil/cv')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            cvUrl: payload.cvUrl,
            name: payload.name ?? '',
            uploadedAt: payload.uploadedAt ?? null,
          },
        }),
      } as Response
    }
    return { ok: true, status: 201, json: async () => ({}) } as Response
  }) as unknown as typeof fetch
}

function setup() {
  const onClose = jest.fn()
  const onSuccess = jest.fn()
  render(
    <CandidatureModal
      opportuniteId="opp-1"
      opportuniteTitre="Stage agri"
      viewer={VIEWER}
      isOpen
      onClose={onClose}
      onSuccess={onSuccess}
    />,
  )
  return { onClose, onSuccess }
}

describe('<CandidatureModal /> — CV depuis profil (GUIC-223)', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('affiche la zone d’upload directe quand le profil n’a pas de CV', async () => {
    mockFetchCv({ cvUrl: null })
    setup()
    await waitFor(() => {
      expect(screen.getByTestId('cv-upload-zone')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('cv-profil-card')).not.toBeInTheDocument()
  })

  it('affiche la carte "Utiliser mon CV de profil" quand un CV existe', async () => {
    mockFetchCv({
      cvUrl: 'https://cdn.example.test/cv/awa-diop.pdf',
      uploadedAt: '2026-05-20T10:00:00.000Z',
    })
    setup()
    await waitFor(() => {
      expect(screen.getByTestId('cv-profil-card')).toBeInTheDocument()
    })
    expect(screen.getByText(/awa-diop\.pdf/i)).toBeInTheDocument()
    expect(screen.getByTestId('cv-toggle-upload')).toHaveTextContent(/charger un nouveau cv/i)
  })

  it('le bouton "Utiliser ce CV" sélectionne le CV de profil', async () => {
    mockFetchCv({
      cvUrl: 'https://cdn.example.test/cv/awa-diop.pdf',
      uploadedAt: '2026-05-20T10:00:00.000Z',
    })
    setup()
    const btn = await screen.findByTestId('cv-use-profil')
    expect(btn).toHaveTextContent(/utiliser ce cv/i)
    fireEvent.click(btn)
    expect(await screen.findByText(/cv de profil sélectionné/i)).toBeInTheDocument()
    expect(screen.getByTestId('cv-use-profil')).toHaveTextContent(/sélectionné/i)
  })
})
