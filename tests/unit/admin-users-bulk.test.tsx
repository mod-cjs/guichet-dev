/**
 * GUIC-701 (PR-C) — Sélection groupée dans AdminUsersTable : checkbox/ligne + tout
 * sélectionner + bulkbar (Exporter / Message groupé / Annuler). TDD — RED.
 */
import { render, screen, fireEvent, within } from '@testing-library/react'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }), usePathname: () => '/admin/utilisateurs' }))
jest.mock('@/app/admin/utilisateurs/MessageGroupeModal', () => ({ MessageGroupeModal: ({ cjsUids }: { cjsUids: string[] }) => <div data-testid="msg-modal">message {cjsUids.length}</div> }))

import { AdminUsersTable, type AdminUserRow, type UtilisateursKpis } from '@/app/admin/utilisateurs/AdminUsersTable'

const ROWS: AdminUserRow[] = [
  { cjsUid: 'u1', prenom: 'Awa', nom: 'Diop', email: 'a@ex.sn', telephone: null, role: null, region: 'Dakar', statut: 'actif', completude: 50, lastSeenAt: new Date() },
  { cjsUid: 'u2', prenom: 'Modou', nom: 'Fall', email: 'm@ex.sn', telephone: null, role: 'conseiller', region: 'Thies', statut: 'actif', completude: null, lastSeenAt: null },
]
const KPIS: UtilisateursKpis = { comptes: 2, jeunes: 1, staff: 1, completudeMoyenne: 50 }
const props = { rows: ROWS, kpis: KPIS, total: 2, currentPage: 1, totalPages: 1, q: '', role: '', statut: '', region: '', sort: 'recent' as const }

describe('GUIC-701 — sélection groupée', () => {
  it('checkbox par ligne + tout sélectionner', () => {
    render(<AdminUsersTable {...props} />)
    expect(screen.getByLabelText(/Tout sélectionner/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Sélectionner /i).length).toBe(2)
  })

  it('sélection → bulkbar (compte + Exporter/Message groupé/Annuler)', () => {
    render(<AdminUsersTable {...props} />)
    fireEvent.click(screen.getAllByLabelText(/Sélectionner /i)[0])
    const bulk = screen.getByRole('region', { name: /sélection groupée/i })
    expect(within(bulk).getByText(/1 sélectionné/i)).toBeInTheDocument()
    expect(within(bulk).getByRole('link', { name: /Exporter/i })).toBeInTheDocument()
    expect(within(bulk).getByRole('button', { name: /Message groupé/i })).toBeInTheDocument()
    expect(within(bulk).getByRole('button', { name: /Annuler/i })).toBeInTheDocument()
  })

  it('« Message groupé » ouvre la modale avec les ids', () => {
    render(<AdminUsersTable {...props} />)
    fireEvent.click(screen.getByLabelText(/Tout sélectionner/i))
    fireEvent.click(within(screen.getByRole('region', { name: /sélection groupée/i })).getByRole('button', { name: /Message groupé/i }))
    expect(screen.getByTestId('msg-modal')).toHaveTextContent('message 2')
  })
})
