import { render, screen } from '@testing-library/react'

jest.mock('@/app/admin/recruteurs/actions', () => ({ basculerStatutRecruteur: jest.fn().mockResolvedValue({ ok: true }) }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }))

import { AdminRecruteursTable, type RecruteurRow } from '@/app/admin/recruteurs/AdminRecruteursTable'

const ITEMS: RecruteurRow[] = [
  { cjsUid: 'u1', nom: 'Aïda Ndoye', email: 'aida@sonatel.sn', statut: 'actif', organisationId: 'org1', organisationNom: 'Sonatel', organisationVerifiee: true, offresCount: 2 },
  { cjsUid: 'u2', nom: 'Modou Fall', email: null, statut: 'inactif', organisationId: null, organisationNom: null, organisationVerifiee: false, offresCount: 0 },
]

describe('GUIC-511 — AdminRecruteursTable', () => {
  it('liste les recruteurs avec statut + organisation', () => {
    render(<AdminRecruteursTable items={ITEMS} total={2} />)
    expect(screen.getByText('Aïda Ndoye')).toBeInTheDocument()
    expect(screen.getByText(/Sonatel/)).toBeInTheDocument()
    expect(screen.getByText('Actif')).toBeInTheDocument()
    expect(screen.getByText('Suspendu')).toBeInTheDocument()
  })

  it('propose Suspendre (actif) et Réactiver (inactif)', () => {
    render(<AdminRecruteursTable items={ITEMS} total={2} />)
    expect(screen.getByRole('button', { name: /Suspendre/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Réactiver/ })).toBeInTheDocument()
  })

  it('lien vers l’organisation quand présente', () => {
    render(<AdminRecruteursTable items={ITEMS} total={2} />)
    expect(screen.getByRole('link', { name: /Organisation/ })).toHaveAttribute('href', '/admin/partenaires/org1')
  })

  it('état vide', () => {
    render(<AdminRecruteursTable items={[]} total={0} />)
    expect(screen.getByText(/Aucun recruteur/)).toBeInTheDocument()
  })
})
