/**
 * GUIC-704 · Lot 2 (RED) — table sources : collecte manuelle + santé.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SourcesAdminTable } from '@/app/admin/sources-veille/sources-admin-table'
import type { SourceRow } from '@/lib/loaders/admin-sources'

const mockLancer = jest.fn()
jest.mock('@/app/admin/sources-veille/actions', () => ({ lancerCollecte: (...a: unknown[]) => mockLancer(...a) }))
jest.mock('@/app/admin/sources-veille/SourceFormModal', () => ({ SourceFormModal: () => null }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))

beforeEach(() => mockLancer.mockReset())

function src(over: Partial<SourceRow> = {}): SourceRow {
  return {
    id: 's1', nom: 'Emploi.sn', url: 'https://demo.emploi.sn/flux', methode: 'auto', frequence: 'quotidienne',
    actif: true, typeDefautId: null, sante: 'ok', nbNouveautes: 4, derniereCollecteLabel: 'il y a 2 heures', ...over,
  }
}

function renderTable(sources: SourceRow[]) {
  return render(<SourcesAdminTable sources={sources} types={[]} nbActives={sources.filter((s) => s.actif).length} nbEnEchec={0} />)
}

describe('GUIC-704 — SourcesAdminTable', () => {
  it('affiche la santé et la dernière collecte d’une source', () => {
    renderTable([src()])
    expect(screen.getByText('OK')).toBeInTheDocument()
    expect(screen.getByText(/il y a 2 heures/)).toBeInTheDocument()
  })

  it('« Lancer la collecte » global appelle lancerCollecte() sans argument', async () => {
    mockLancer.mockResolvedValue({ ignore: false, sourcesTraitees: 3, nbNouveautes: 2 })
    renderTable([src()])
    fireEvent.click(screen.getByRole('button', { name: /^Lancer la collecte$/i }))
    await waitFor(() => expect(mockLancer).toHaveBeenCalledWith(undefined))
  })

  it('« Collecter » sur une source appelle lancerCollecte(id)', async () => {
    mockLancer.mockResolvedValue({ ignore: false, sourcesTraitees: 1, nbNouveautes: 1 })
    renderTable([src({ id: 's-emploi' })])
    fireEvent.click(screen.getByRole('button', { name: /Lancer la collecte de Emploi\.sn/i }))
    await waitFor(() => expect(mockLancer).toHaveBeenCalledWith('s-emploi'))
  })

  it('badge « Échec » pour une source en erreur', () => {
    renderTable([src({ sante: 'echec' })])
    expect(screen.getByText('Échec')).toBeInTheDocument()
  })
})
