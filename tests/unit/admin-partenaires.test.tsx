import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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

describe('GUIC-510/681 — AdminPartenairesTable (grille de cartes + dossier)', () => {
  it('grille : une carte par partenaire avec badge de vérification', () => {
    render(<AdminPartenairesTable items={ITEMS} total={2} />)
    expect(screen.getByText('Sonatel')).toBeInTheDocument()
    expect(screen.getByText('Baobab SARL')).toBeInTheDocument()
    expect(screen.getByText('Vérifié')).toBeInTheDocument()
    expect(screen.getByText('Non vérifié')).toBeInTheDocument()
  })

  it('clic carte → dossier slide-over avec Vérifier/Dévérifier + Éditer', async () => {
    render(<AdminPartenairesTable items={ITEMS} total={2} />)
    await userEvent.click(screen.getByRole('button', { name: /Sonatel/ }))
    const dialog = await screen.findByRole('dialog')
    // Sonatel est vérifié -> action Dévérifier
    expect(within(dialog).getByRole('button', { name: /^Dévérifier/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Éditer/ })).toBeInTheDocument()
  })

  it('dossier : lien vers la fiche complète du partenaire', async () => {
    render(<AdminPartenairesTable items={ITEMS} total={2} />)
    await userEvent.click(screen.getByRole('button', { name: /Sonatel/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('link', { name: /Fiche complète/ })).toHaveAttribute('href', '/admin/partenaires/o1')
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
