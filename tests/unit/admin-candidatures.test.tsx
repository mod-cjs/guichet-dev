/**
 * GUIC-462 (F1) — AdminCandidaturesTable : SUPERVISION admin (Lot 11).
 * L'admin supervise (vue globale, stats, export, détection de blocages) ;
 * il NE décide PAS (Retenir/Refuser = rôle recruteur). TDD.
 */
import { render, screen, fireEvent, within } from '@testing-library/react'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/admin/candidatures',
}))

import {
  AdminCandidaturesTable,
  type CandidatureRow,
  type StatutCount,
} from '@/app/admin/candidatures/AdminCandidaturesTable'

beforeEach(() => mockPush.mockReset())

const ROWS: CandidatureRow[] = [
  {
    id: 'c1',
    candidatCjsUid: 'uid-awa',
    candidatPrenom: 'Awa',
    candidatNom: 'Diop',
    opportuniteId: 'opp-1',
    opportuniteTitre: 'Développeur full-stack',
    organisation: 'Sonatel',
    statut: 'En_attente',
    soumiseA: new Date('2026-05-20T10:00:00Z'),
    enRetard: true,
  },
  {
    id: 'c2',
    candidatCjsUid: 'uid-mamadou',
    candidatPrenom: 'Mamadou',
    candidatNom: 'Sow',
    opportuniteId: 'opp-2',
    opportuniteTitre: 'Bourse mobilité',
    organisation: 'CJS',
    statut: 'Retenue',
    soumiseA: new Date('2026-06-15T10:00:00Z'),
    enRetard: false,
  },
]

const COUNTS: StatutCount[] = [
  { statut: 'En_attente', _count: { id: 40 } },
  { statut: 'Vue', _count: { id: 25 } },
  { statut: 'Retenue', _count: { id: 20 } },
  { statut: 'Refusee', _count: { id: 15 } },
]

const defaultProps = {
  rows: ROWS,
  statutCounts: COUNTS,
  total: 100,
  tauxPlacement: 20,
  bloqueesCount: 5,
  currentPage: 1,
  totalPages: 5,
  q: '',
  statut: '',
}

describe('GUIC-462 — AdminCandidaturesTable (supervision)', () => {
  it('affiche le titre "Candidatures" et le total', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getByRole('heading', { name: /candidatures/i })).toBeInTheDocument()
    expect(screen.getByText(/100 candidatures/i)).toBeInTheDocument()
  })

  it('affiche le taux de placement (KPI YEAH)', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getByText(/taux de placement/i)).toBeInTheDocument()
    expect(screen.getByText(/20\s*%/)).toBeInTheDocument()
  })

  it('affiche le nombre de candidatures à relancer (blocages)', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    // header "5 à relancer" + badge de ligne "À relancer"
    expect(screen.getAllByText(/à relancer/i).length).toBeGreaterThanOrEqual(2)
  })

  it('rend les chips de filtre par statut avec compteurs', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getByRole('button', { name: /tous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /en attente.*40/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retenue.*20/i })).toBeInTheDocument()
  })

  it('affiche candidat + opportunité + organisation par ligne', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getAllByText(/Awa Diop/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Développeur full-stack/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Sonatel/i).length).toBeGreaterThanOrEqual(1)
  })

  it('NE rend AUCUN bouton de décision (Retenir / Refuser) — réservé au recruteur', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /retenir/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /refuser/i })).toBeNull()
  })

  it('propose un export CSV respectant les filtres', () => {
    render(<AdminCandidaturesTable {...defaultProps} statut="Retenue" q="Diop" />)
    const exportLink = screen.getByRole('link', { name: /exporter/i })
    expect(exportLink).toHaveAttribute('href', expect.stringContaining('/api/admin/candidatures/export'))
    expect(exportLink.getAttribute('href')).toContain('statut=Retenue')
    expect(exportLink.getAttribute('href')).toContain('q=Diop')
  })

  // CAND-3 — drill-down : candidat → fiche, opportunité → aperçu admin.
  it('le candidat est un lien vers sa fiche, l’opportunité vers l’aperçu admin', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    const candidat = screen.getAllByRole('link', { name: /Awa Diop/i })[0]
    expect(candidat).toHaveAttribute('href', '/admin/utilisateurs/uid-awa')
    const opp = screen.getAllByRole('link', { name: /Développeur full-stack/i })[0]
    expect(opp).toHaveAttribute('href', '/admin/opportunites/opp-1/apercu')
  })

  // CAND-1 — vue mobile en cartes (était un tableau 4 colonnes tassé).
  it('rend une liste mobile en cartes (md:hidden)', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    const mobile = screen.getByLabelText('Liste des candidatures (vue mobile)')
    expect(mobile.className).toMatch(/md:hidden/)
    // chaque carte référence le candidat et l'opportunité (liens drill-down dupliqués)
    expect(within(mobile).getAllByRole('link', { name: /Awa Diop/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('given une saisie, when submit recherche, then router.push avec ?q=', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    const input = screen.getByLabelText(/rechercher une candidature/i)
    fireEvent.change(input, { target: { value: 'Diop' } })
    fireEvent.submit(input.closest('form')!)
    expect(mockPush).toHaveBeenCalledWith('/admin/candidatures?q=Diop')
  })

  it('rend la pagination quand totalPages > 1', () => {
    render(<AdminCandidaturesTable {...defaultProps} />)
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
  })

  it('affiche un état vide si aucune candidature', () => {
    render(<AdminCandidaturesTable {...defaultProps} rows={[]} total={0} totalPages={0} />)
    // Présent côté desktop (table) ET côté mobile (cartes) — au moins une occurrence.
    expect(screen.getAllByText(/aucune candidature/i).length).toBeGreaterThanOrEqual(1)
  })
})
