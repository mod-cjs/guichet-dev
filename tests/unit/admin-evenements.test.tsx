import { render, screen } from '@testing-library/react'
import { AdminEvenementsTable, type EvenementRow } from '@/app/admin/evenements/AdminEvenementsTable'

const ROWS: EvenementRow[] = [
  {
    id: 'e1',
    titre: 'Forum emploi Dakar',
    type: 'Forum',
    statut: 'a_venir',
    dateLabel: '12 juil. 2026',
    lieuLabel: 'Centre Dakar Plateau',
    inscrits: 84,
    capaciteMax: 120,
  },
  {
    id: 'e2',
    titre: 'Atelier CV',
    type: 'Atelier',
    statut: 'termine',
    dateLabel: '2 mai 2026',
    lieuLabel: 'Thiès',
    inscrits: 30,
    capaciteMax: null,
  },
]

describe('GUIC-454 — AdminEvenementsTable (Lot 11)', () => {
  it('affiche le titre et le total', () => {
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{}} />)
    expect(screen.getByRole('heading', { name: /événements/i })).toBeInTheDocument()
    expect(screen.getByText(/2 événements/i)).toBeInTheDocument()
  })

  it('affiche les en-têtes de colonnes', () => {
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{}} />)
    for (const h of ['Événement', 'Date', 'Lieu', 'Inscrits', 'Statut']) {
      expect(screen.getAllByText(new RegExp(h, 'i')).length).toBeGreaterThan(0)
    }
  })

  it('affiche le titre, le type et le statut d\'une ligne', () => {
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{}} />)
    expect(screen.getAllByText('Forum emploi Dakar').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Forum').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/À venir/i).length).toBeGreaterThan(0)
  })

  it('affiche les inscrits sur la capacité', () => {
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{}} />)
    expect(screen.getAllByText(/84\s*\/\s*120/).length).toBeGreaterThan(0)
  })

  it('rend les chips de filtre statut', () => {
    render(<AdminEvenementsTable evenements={ROWS} total={2} activeStatut={null} counts={{ a_venir: 5 }} />)
    expect(screen.getByRole('link', { name: /Tous/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /À venir/i })).toBeInTheDocument()
  })

  it('affiche un état vide si aucun événement', () => {
    render(<AdminEvenementsTable evenements={[]} total={0} activeStatut={null} counts={{}} />)
    expect(screen.getByText(/Aucun événement/i)).toBeInTheDocument()
  })
})
