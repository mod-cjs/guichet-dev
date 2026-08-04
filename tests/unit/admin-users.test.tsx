/**
 * GUIC-452 → GUIC-701 — AdminUsersTable (refonte). Supervision : rôle SSO lecture seule.
 */
import { render, screen, fireEvent, within } from '@testing-library/react'
import { AdminUsersTable, type AdminUserRow, type UtilisateursKpis } from '@/app/admin/utilisateurs/AdminUsersTable'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => '/admin/utilisateurs',
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock('@/app/admin/utilisateurs/MessageGroupeModal', () => ({ MessageGroupeModal: () => null }))

beforeEach(() => mockPush.mockClear())

const ROWS: AdminUserRow[] = [
  { cjsUid: 'uid-001', prenom: 'Awa', nom: 'Diallo', email: 'awa@ex.sn', telephone: '+221770000010', role: 'conseiller', region: 'Dakar', statut: 'actif', completude: null, lastSeenAt: new Date() },
  { cjsUid: 'uid-002', prenom: 'Modou', nom: 'Sow', email: 'modou@ex.sn', telephone: null, role: null, region: 'Thies', statut: 'inactif', completude: 40, lastSeenAt: null },
]
const KPIS: UtilisateursKpis = { comptes: 100, jeunes: 80, staff: 20, completudeMoyenne: 55 }
const props = { rows: ROWS, kpis: KPIS, total: 100, currentPage: 1, totalPages: 5, q: '', role: '', statut: '', region: '', sort: 'recent' as const }

describe('GUIC-701 — AdminUsersTable', () => {
  it('affiche le titre + le total', () => {
    render(<AdminUsersTable {...props} />)
    expect(screen.getByRole('heading', { name: /Utilisateurs/i })).toBeInTheDocument()
    expect(screen.getByText(/100 comptes/i)).toBeInTheDocument()
  })

  it('rend les chips de filtre rôle et statut', () => {
    render(<AdminUsersTable {...props} />)
    expect(screen.getByRole('button', { name: /^Tous rôles$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Jeunes$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Actifs$/i })).toBeInTheDocument()
  })

  it('recherche → router.push avec ?q=', () => {
    render(<AdminUsersTable {...props} />)
    const input = screen.getByLabelText(/Rechercher un utilisateur/i)
    fireEvent.change(input, { target: { value: 'Diallo' } })
    fireEvent.submit(input.closest('form')!)
    expect(mockPush).toHaveBeenCalledWith('/admin/utilisateurs?q=Diallo')
  })

  it('drill-down : lien « Détail » vers la fiche utilisateur', () => {
    render(<AdminUsersTable {...props} />)
    expect(screen.getAllByRole('link', { name: /Détail/i })[0]).toHaveAttribute('href', '/admin/utilisateurs/uid-001')
  })

  it('export CDP respecte les filtres', () => {
    render(<AdminUsersTable {...props} role="conseiller" region="Dakar" />)
    const a = screen.getByRole('link', { name: /Exporter/i })
    expect(a.getAttribute('href')).toContain('/api/admin/export/utilisateurs')
    expect(a.getAttribute('href')).toContain('role=conseiller')
    expect(a.getAttribute('href')).toContain('region=Dakar')
  })

  it('vue mobile en cartes', () => {
    render(<AdminUsersTable {...props} />)
    const m = screen.getByLabelText('Liste des utilisateurs (vue mobile)')
    expect(m.className).toMatch(/md:hidden/)
    expect(within(m).getAllByRole('link').length).toBeGreaterThanOrEqual(1)
  })

  it('pagination si totalPages > 1', () => {
    render(<AdminUsersTable {...props} />)
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
  })

  it('état vide', () => {
    render(<AdminUsersTable {...props} rows={[]} total={0} totalPages={0} />)
    expect(screen.getAllByText(/Aucun utilisateur/i).length).toBeGreaterThanOrEqual(1)
  })
})
