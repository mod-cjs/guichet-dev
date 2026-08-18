/**
 * GUIC-692 (F5/F6) — AdminCandidaturesTable : retours Toast.
 * F5 — `openDetail` avalait toute erreur (throw) ou l'introuvable (null) sans rien
 *      afficher : erreur → Toast "Impossible d'ouvrir la fiche.", null → Toast info
 *      "Candidature introuvable.", panneau jamais ouvert dans les deux cas.
 * F6 — le résultat de relance ({ envoyees, ignorees) était jeté par `onDone={() =>
 *      router.refresh()}` : la table doit afficher un Toast récapitulatif avant refresh.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockPush = jest.fn()
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => '/admin/candidatures',
}))

const mockChargerCandidatureDetail = jest.fn()
jest.mock('@/app/admin/candidatures/actions', () => ({ chargerCandidatureDetail: (...a: unknown[]) => mockChargerCandidatureDetail(...a) }))

const mockDetailPanel = jest.fn(() => null)
jest.mock('@/app/admin/candidatures/CandidatureDetailPanel', () => ({ CandidatureDetailPanel: (...a: unknown[]) => mockDetailPanel(...a) }))

let capturedOnDone: ((r: { envoyees: number; ignorees: number }) => void) | undefined
jest.mock('@/app/admin/candidatures/RelanceModal', () => ({
  RelanceModal: ({ onDone }: { onDone?: (r: { envoyees: number; ignorees: number }) => void }) => {
    capturedOnDone = onDone
    return null
  },
}))

import { AdminCandidaturesTable, type CandidatureRow, type CandidaturesFunnel, type CandidaturesKpis } from '@/app/admin/candidatures/AdminCandidaturesTable'

const ROWS: CandidatureRow[] = [
  { id: 'c1', candidatCjsUid: 'u-awa', candidatPrenom: 'Awa', candidatNom: 'Diop', opportuniteId: 'o1', opportuniteTitre: 'Dev', recruteur: 'Sonatel', statut: 'En_attente', soumiseA: new Date(), enRetard: false, score: 72, etape: 'Recue', favori: false },
]
const FUNNEL: CandidaturesFunnel = { recue: 40, preselection: 25, entretien: 18, decision: 20, retenue: 20, conversionPct: 50 }
const KPIS: CandidaturesKpis = { enAttente: 40, vues: 25, retenues: 20, scoreMoyen: 71, insertions: 900 }
const defaultProps = { rows: ROWS, funnel: FUNNEL, kpis: KPIS, total: 1, currentPage: 1, totalPages: 1, q: '', statut: '', etape: '', sort: 'recent' as const }

beforeEach(() => {
  mockPush.mockReset(); mockRefresh.mockReset(); mockChargerCandidatureDetail.mockReset(); mockDetailPanel.mockClear(); capturedOnDone = undefined
})

describe('GUIC-692 — F5 : erreur/absence avalée à l’ouverture de la fiche', () => {
  it('given chargerCandidatureDetail qui jette, when clic Détail, then Toast erreur + panneau non ouvert', async () => {
    mockChargerCandidatureDetail.mockRejectedValue(new Error('boom'))
    render(<AdminCandidaturesTable {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Détail de Awa Diop/i }))
    await screen.findByText(/Impossible d.?ouvrir la fiche/i)
    expect(mockDetailPanel).not.toHaveBeenCalled()
  })

  it('given chargerCandidatureDetail qui renvoie null, when clic Détail, then Toast info "introuvable" + panneau non ouvert', async () => {
    mockChargerCandidatureDetail.mockResolvedValue(null)
    render(<AdminCandidaturesTable {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Détail de Awa Diop/i }))
    await screen.findByText(/Candidature introuvable/i)
    expect(mockDetailPanel).not.toHaveBeenCalled()
  })
})

describe('GUIC-692 — F6 : résultat de relance jeté par la table', () => {
  it('given RelanceModal.onDone({ envoyees, ignorees }), then Toast récapitulatif + router.refresh()', async () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    // Ouvre la modale de relance via la sélection groupée pour capter le prop onDone.
    fireEvent.click(screen.getByLabelText(/Sélectionner la candidature de Awa Diop/i))
    fireEvent.click(screen.getByRole('button', { name: /^Relancer$/i }))
    expect(capturedOnDone).toBeInstanceOf(Function)

    capturedOnDone!({ envoyees: 3, ignorees: 1 })

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    expect(screen.getByText(/3/)).toBeInTheDocument()
    expect(screen.getByText(/relance/i)).toBeInTheDocument()
    expect(screen.getByText(/1/)).toBeInTheDocument()
    expect(screen.getByText(/ignor/i)).toBeInTheDocument()
  })
})
