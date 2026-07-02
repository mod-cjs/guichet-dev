import { render, screen } from '@testing-library/react'

jest.mock('@/app/admin/partenaires/actions', () => ({
  basculerVerifiePartenaire: jest.fn().mockResolvedValue({ ok: true }),
  modifierPartenaire: jest.fn().mockResolvedValue({ ok: true }),
}))
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }))

import { AdminPartenairesTable, type PartenaireRow } from '@/app/admin/partenaires/AdminPartenairesTable'

const ITEMS: PartenaireRow[] = [
  { id: 'o1', nom: 'Sonatel', secteur: 'Numerique', region: 'Dakar', email: 'rh@sonatel.sn', estVerifie: true, opportunitesCount: 5 },
  { id: 'o2', nom: 'Baobab SARL', secteur: null, region: null, email: null, estVerifie: false, opportunitesCount: 0 },
]

describe('GUIC-510 — AdminPartenairesTable', () => {
  it('liste les partenaires avec badge de vérification', () => {
    render(<AdminPartenairesTable items={ITEMS} total={2} />)
    expect(screen.getByText('Sonatel')).toBeInTheDocument()
    expect(screen.getByText('Baobab SARL')).toBeInTheDocument()
    expect(screen.getByText('Vérifié')).toBeInTheDocument()
    expect(screen.getByText('Non vérifié')).toBeInTheDocument()
  })

  it('propose Vérifier sur un non-vérifié et Dévérifier sur un vérifié', () => {
    render(<AdminPartenairesTable items={ITEMS} total={2} />)
    expect(screen.getByRole('button', { name: /^Dévérifier/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Vérifier/ })).toBeInTheDocument()
  })

  it('lien Détail par partenaire', () => {
    render(<AdminPartenairesTable items={ITEMS} total={2} />)
    expect(screen.getAllByRole('link', { name: /Détail/ })[0]).toHaveAttribute('href', '/admin/partenaires/o1')
  })

  it('filtres de vérification (Tous / Vérifiés / Non vérifiés)', () => {
    render(<AdminPartenairesTable items={ITEMS} total={2} />)
    expect(screen.getByRole('tab', { name: 'Vérifiés' })).toHaveAttribute('href', '/admin/partenaires?verifie=oui')
  })

  it('état vide', () => {
    render(<AdminPartenairesTable items={[]} total={0} />)
    expect(screen.getByText(/Aucun partenaire pour ce filtre/)).toBeInTheDocument()
  })
})
