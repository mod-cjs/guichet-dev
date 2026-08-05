/**
 * GUIC-702 · PR-C (RED) — sélection groupée + « Approuver les vérifiés ».
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminModerationList } from '@/app/admin/opportunites/AdminModerationList'
import type { ModerationRow } from '@/lib/loaders/admin-moderation'

const mockApprouverPlusieurs = jest.fn()
jest.mock('@/app/admin/opportunites/actions', () => ({
  approuverOpportunite: jest.fn(),
  approuverPlusieurs: (...a: unknown[]) => mockApprouverPlusieurs(...a),
  chargerModerationDetail: jest.fn(),
}))
jest.mock('@/app/admin/opportunites/RejetMotifModal', () => ({ RejetMotifModal: () => null }))
jest.mock('@/app/admin/opportunites/CorrectionModal', () => ({ CorrectionModal: () => null }))
jest.mock('@/app/admin/opportunites/ModerationDetailPanel', () => ({ ModerationDetailPanel: () => null }))

beforeEach(() => mockApprouverPlusieurs.mockReset())

function row(over: Partial<ModerationRow> = {}): ModerationRow {
  return {
    id: 'r1', slug: 's', titre: 'Offre R1', typeLabel: 'Stage', organisation: 'Org', source: 'recruteur',
    localisation: 'Dakar', ageHeures: 3, ageLabel: 'en attente 3 h', urgent: false, signaux: [], niveau: null,
    extrait: 'x', ...over,
  }
}
const KPIS = { tout: 2, signalees: 1, nouvelles: 2, recruteur: 2, veille: 0 }

function renderList(rows: ModerationRow[], verifiesIds: string[] = []) {
  return render(<AdminModerationList rows={rows} kpis={KPIS} total={rows.length} currentPage={1} totalPages={1} q="" filtre="tout" verifiesIds={verifiesIds} tronque={false} totalBrouillons={rows.length} />)
}

describe('GUIC-702 — sélection groupée modération', () => {
  it('cocher une carte fait apparaître la barre groupée avec le compte', () => {
    renderList([row({ id: 'r1', titre: 'Offre R1' })])
    fireEvent.click(screen.getByLabelText(/Sélectionner Offre R1/i))
    expect(screen.getByText(/1 sélectionnée/i)).toBeInTheDocument()
  })

  it('la barre groupée « Approuver » appelle approuverPlusieurs avec la sélection', async () => {
    mockApprouverPlusieurs.mockResolvedValue({ approuvees: 1, ignorees: 0 })
    renderList([row({ id: 'r1', titre: 'Offre R1' }), row({ id: 'r2', titre: 'Offre R2' })])
    fireEvent.click(screen.getByLabelText(/Sélectionner Offre R1/i))
    fireEvent.click(screen.getByRole('button', { name: /^Approuver la sélection$/i }))
    await waitFor(() => expect(mockApprouverPlusieurs).toHaveBeenCalledWith(['r1']))
  })

  it('« Approuver les vérifiés » approuve les IDs vérifiés fournis (file-wide, F3)', async () => {
    mockApprouverPlusieurs.mockResolvedValue({ approuvees: 1, ignorees: 0 })
    // verifiesIds vient du serveur (toute la file), pas seulement la page affichée.
    renderList([row({ id: 'ok', niveau: null })], ['ok', 'autre-page'])
    fireEvent.click(screen.getByRole('button', { name: /Approuver les v[ée]rifi[ée]s/i }))
    await waitFor(() => expect(mockApprouverPlusieurs).toHaveBeenCalledWith(['ok', 'autre-page']))
  })
})
