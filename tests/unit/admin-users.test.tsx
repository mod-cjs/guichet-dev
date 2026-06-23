/**
 * GUIC-452 — AdminUsersTable Lot 11 (sombre + doré)
 * Tests RED : assertions sur la page Utilisateurs admin design v3.
 */
import { render, screen } from '@testing-library/react'
import { AdminUsersTable, type AdminUserRow, type StatutCount } from '@/app/admin/utilisateurs/AdminUsersTable'

jest.mock('next/navigation', () => ({
  useRouter:    () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname:  () => '/admin/utilisateurs',
  useSearchParams: () => new URLSearchParams(),
}))

const MOCK_ROWS: AdminUserRow[] = [
  {
    cjsUid: 'uid-001',
    nom: 'Diallo',
    prenom: 'Fatou',
    email: 'fatou.diallo@example.com',
    commune: 'Dakar Plateau',
    statut: 'actif',
    createdAt: new Date('2025-01-15T10:00:00Z'),
    centrePrincipalNom: 'Centre CJS Dakar',
  },
  {
    cjsUid: 'uid-002',
    nom: 'Sow',
    prenom: 'Mamadou',
    email: 'mamadou.sow@example.com',
    commune: 'Thiès',
    statut: 'inactif',
    createdAt: new Date('2025-03-20T14:00:00Z'),
    centrePrincipalNom: null,
  },
  {
    cjsUid: 'uid-003',
    nom: 'Ndiaye',
    prenom: 'Aissatou',
    email: 'aissatou.ndiaye@example.com',
    commune: 'Saint-Louis',
    statut: 'anonymise',
    createdAt: new Date('2025-06-01T08:00:00Z'),
    centrePrincipalNom: 'Centre CJS Saint-Louis',
  },
]

const MOCK_STATUT_COUNTS: StatutCount[] = [
  { statut: 'actif', _count: { cjsUid: 150 } },
  { statut: 'inactif', _count: { cjsUid: 45 } },
  { statut: 'anonymise', _count: { cjsUid: 5 } },
]

describe('GUIC-452 — AdminUsersTable Lot 11 utilisateurs', () => {
  const defaultProps = {
    rows: MOCK_ROWS,
    statutCounts: MOCK_STATUT_COUNTS,
    total: 200,
    currentPage: 1,
    totalPages: 10,
    q: '',
    statut: '',
  }

  /* ── En-tête page ────────────────────────────────────────────────────── */
  it('affiche le titre "Utilisateurs"', () => {
    render(<AdminUsersTable {...defaultProps} />)
    expect(screen.getByRole('heading', { name: /utilisateurs/i })).toBeInTheDocument()
  })

  it('affiche le sous-titre avec le total de comptes', () => {
    render(<AdminUsersTable {...defaultProps} />)
    expect(screen.getByText(/200 comptes/i)).toBeInTheDocument()
  })

  /* ── Champ de recherche ──────────────────────────────────────────────── */
  it('affiche un champ de recherche avec icône search', () => {
    const { container } = render(<AdminUsersTable {...defaultProps} />)
    const input = screen.getByPlaceholderText(/rechercher/i)
    expect(input).toBeInTheDocument()
    // l'icône search est dans le sprite via <use href="/icons.svg#i-search">
    const useEl = container.querySelector('use[href="/icons.svg#i-search"]')
    expect(useEl).not.toBeNull()
  })

  /* ── Chips filtre statut ─────────────────────────────────────────────── */
  it('rend le chip "Tous"', () => {
    render(<AdminUsersTable {...defaultProps} />)
    const tous = screen.getByRole('button', { name: /tous/i })
    expect(tous).toBeInTheDocument()
  })

  it('rend les chips pour chaque statut avec leur compteur', () => {
    render(<AdminUsersTable {...defaultProps} />)
    // Utilise getAllByRole car "Actif" peut matcher "Inactif" aussi → on veut exactement Actif (150)
    const chips = screen.getAllByRole('button')
    const actifChip = chips.find((b) => b.textContent?.includes('Actif') && !b.textContent?.includes('Inactif'))
    expect(actifChip).toBeDefined()
    expect(screen.getByRole('button', { name: /inactif/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /anonymis/i })).toBeInTheDocument()
    // les compteurs sont affichés
    expect(screen.getByText(/150/)).toBeInTheDocument()
    expect(screen.getByText(/45/)).toBeInTheDocument()
  })

  it('le chip "Tous" est sélectionné quand statut est vide', () => {
    render(<AdminUsersTable {...defaultProps} statut="" />)
    const tousChip = screen.getByRole('button', { name: /tous/i })
    expect(tousChip).toHaveAttribute('aria-pressed', 'true')
  })

  it('le chip correspondant au statut filtré est sélectionné', () => {
    render(<AdminUsersTable {...defaultProps} statut="actif" />)
    // Cherche le chip dont le texte contient "Actif" mais pas "Inactif"
    const chips = screen.getAllByRole('button')
    const actifChip = chips.find((b) => b.textContent?.includes('Actif') && !b.textContent?.includes('Inactif'))
    expect(actifChip).toBeDefined()
    expect(actifChip).toHaveAttribute('aria-pressed', 'true')
  })

  /* ── En-têtes de colonnes ────────────────────────────────────────────── */
  it('affiche les colonnes: Utilisateur, Rôle, Centre/Commune, Statut', () => {
    render(<AdminUsersTable {...defaultProps} />)
    // getAllByText car "Utilisateur" peut apparaître dans le titre ET les en-têtes
    expect(screen.getAllByText(/utilisateur/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Rôle')).toBeInTheDocument()
    expect(screen.getByText('Centre / Commune')).toBeInTheDocument()
    expect(screen.getByText('Statut')).toBeInTheDocument()
  })

  /* ── Données de lignes ───────────────────────────────────────────────── */
  it('affiche le nom et prénom du premier utilisateur', () => {
    render(<AdminUsersTable {...defaultProps} />)
    const matches = screen.getAllByText(/Fatou Diallo/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('affiche le pill "Bénéficiaire" pour chaque ligne', () => {
    render(<AdminUsersTable {...defaultProps} />)
    const pills = screen.getAllByText(/bénéficiaire/i)
    expect(pills.length).toBeGreaterThanOrEqual(MOCK_ROWS.length)
  })

  it('affiche la commune ou le centre du premier utilisateur', () => {
    render(<AdminUsersTable {...defaultProps} />)
    // Le 1er user a un centrePrincipalNom — peut apparaître dans table + mobile cards
    const matches = screen.getAllByText(/Centre CJS Dakar/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('affiche la commune du 2e utilisateur (sans centre principal)', () => {
    render(<AdminUsersTable {...defaultProps} />)
    // 2e row : pas de centrePrincipalNom → affiche commune "Thiès"
    const matches = screen.getAllByText(/Thiès/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('affiche un indicateur de statut coloré pour le 2e utilisateur (inactif)', () => {
    render(<AdminUsersTable {...defaultProps} />)
    // le statut "inactif" est affiché avec un label
    const inactifs = screen.getAllByText(/inactif/i)
    expect(inactifs.length).toBeGreaterThanOrEqual(1)
  })

  it('affiche un bouton d\'action settings par ligne', () => {
    const { container } = render(<AdminUsersTable {...defaultProps} />)
    const settingsIcons = container.querySelectorAll('use[href="/icons.svg#i-settings"]')
    expect(settingsIcons.length).toBe(MOCK_ROWS.length)
  })

  /* ── Initiales avatar ────────────────────────────────────────────────── */
  it('affiche les initiales de l\'avatar du premier utilisateur', () => {
    render(<AdminUsersTable {...defaultProps} />)
    // Fatou Diallo → "FD" (peut apparaître dans table + mobile cards)
    const matches = screen.getAllByText('FD')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  /* ── Pagination ──────────────────────────────────────────────────────── */
  it('affiche les contrôles de pagination', () => {
    render(<AdminUsersTable {...defaultProps} totalPages={10} currentPage={1} />)
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
  })

  it('n\'affiche pas la pagination si une seule page', () => {
    render(<AdminUsersTable {...defaultProps} totalPages={1} />)
    expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull()
  })

  /* ── État vide ───────────────────────────────────────────────────────── */
  it('affiche un message "Aucun utilisateur" si rows est vide', () => {
    render(<AdminUsersTable {...defaultProps} rows={[]} total={0} totalPages={0} />)
    expect(screen.getByText(/aucun utilisateur/i)).toBeInTheDocument()
  })
})
