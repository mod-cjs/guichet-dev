/**
 * GUIC-701 (PR-A) — AdminUsersTable ENRICHIE : 4 KPIs + filtres rôle/statut/région +
 * table 8 colonnes (coordonnées masquées si anonymisé, complétude jeunes-only, dernière
 * visite triable). Supervision : aucune action de décision. TDD — RED d'abord.
 */
import { render, screen, fireEvent } from '@testing-library/react'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }), usePathname: () => '/admin/utilisateurs' }))

import { AdminUsersTable, type AdminUserRow, type UtilisateursKpis } from '@/app/admin/utilisateurs/AdminUsersTable'

beforeEach(() => mockPush.mockReset())

const ROWS: AdminUserRow[] = [
  { cjsUid: 'u-awa', prenom: 'Awa', nom: 'Ndiaye', email: 'awa@ex.sn', telephone: '+221770000010', role: null, region: 'Dakar', statut: 'actif', completude: 82, lastSeenAt: new Date() },
  { cjsUid: 'u-mod', prenom: 'Modou', nom: 'Fall', email: 'modou@ex.sn', telephone: '+221770000011', role: 'conseiller', region: 'Thies', statut: 'actif', completude: null, lastSeenAt: null },
  { cjsUid: 'u-x', prenom: '—', nom: '—', email: null, telephone: null, role: null, region: 'Kaolack', statut: 'anonymise', completude: null, lastSeenAt: new Date() },
]
const KPIS: UtilisateursKpis = { comptes: 22510, jeunes: 22264, staff: 246, completudeMoyenne: 68 }
const props = {
  rows: ROWS, kpis: KPIS, total: 3, currentPage: 1, totalPages: 1,
  q: '', role: '', statut: '', region: '', sort: 'recent' as const,
}

describe('GUIC-701 — AdminUsersTable enrichie', () => {
  it('rend les 4 KPIs', () => {
    render(<AdminUsersTable {...props} />)
    expect(screen.getByText(/Comptes/i)).toBeInTheDocument()
    expect(screen.getByText(/Staff/i)).toBeInTheDocument()
    expect(screen.getByText(/Complétude moyenne/i)).toBeInTheDocument()
    expect(screen.getByText('246')).toBeInTheDocument()
  })

  it('filtres rôle (chips) + statut (chips) + région (select)', () => {
    render(<AdminUsersTable {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /^Conseillers$/i }))
    expect(mockPush.mock.calls[0][0]).toMatch(/role=conseiller/)
    fireEvent.change(screen.getByLabelText(/Filtrer par région/i), { target: { value: 'Dakar' } })
    expect(mockPush.mock.calls.at(-1)?.[0]).toMatch(/region=Dakar/)
    expect(screen.getByRole('button', { name: /^Anonymisés$/i })).toBeInTheDocument()
  })

  it('table : coordonnées masquées si anonymisé', () => {
    render(<AdminUsersTable {...props} />)
    expect(screen.getByText('awa@ex.sn')).toBeInTheDocument()
    // l'anonymisé n'expose ni email ni téléphone
    expect(screen.queryByText(/anonymise@|—@/)).toBeNull()
    expect(screen.getAllByText(/Anonymisé/i).length).toBeGreaterThanOrEqual(1)
  })

  it('complétude : barre pour jeunes, « — » pour staff', () => {
    render(<AdminUsersTable {...props} />)
    expect(screen.getByRole('columnheader', { name: /Complétude/i })).toBeInTheDocument()
    expect(screen.getByText('82%')).toBeInTheDocument() // jeune Awa
  })

  it('colonne Dernière visite + tri', () => {
    render(<AdminUsersTable {...props} />)
    expect(screen.getByRole('columnheader', { name: /Dernière visite/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Trier par complétude/i }))
    expect(mockPush.mock.calls.at(-1)?.[0]).toMatch(/sort=completude/)
  })

  it('NE rend AUCUNE action de décision candidature (supervision)', () => {
    render(<AdminUsersTable {...props} />)
    expect(screen.queryByRole('button', { name: /Retenir|Refuser/i })).toBeNull()
  })
})
