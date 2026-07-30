/**
 * GUIC-457 / GUIC-682 — CentresAdminTable : KPIs réseau + grille de cartes letterhead
 * (fidélité maquette). Édition/suppression migrées vers la fiche Centre (GUIC-687).
 */
import { render, screen, fireEvent, within } from '@testing-library/react'

jest.mock('@/app/admin/centres/actions', () => ({
  creerCentre: jest.fn(),
  modifierCentre: jest.fn(),
  supprimerCentre: jest.fn(),
}))

import { CentresAdminTable, type CentreRow, type CentresStats } from '@/app/admin/centres/centres-admin-table'

const MOCK: CentreRow[] = [
  {
    id: 'c1', nom: 'CJS Dakar', region: 'Dakar', adresse: '12 rue de Thiong',
    latitude: 14.7, longitude: -17.45, telephone: '+221770000001', estActif: true,
    responsable: 'Fatou Diallo', ville: 'Dakar', createdAt: new Date('2024-01-01'),
    staff: 8, jeunes: 8940, insertion: 42, ouvert: true, fermeA: '17:00',
    services: ['WiFi', 'Bibliotheque', 'Coworking', 'Ateliers'], nouveau: false,
  },
  {
    id: 'c2', nom: 'CJS Kolda', region: 'Kolda', adresse: 'Centre-ville',
    latitude: 12.9, longitude: -14.9, telephone: '+221770000002', estActif: false,
    responsable: 'Moussa Diop', ville: 'Kolda', createdAt: new Date(),
    staff: 2, jeunes: 180, insertion: 15, ouvert: false, fermeA: null,
    services: ['WiFi'], nouveau: true,
  },
]

const STATS: CentresStats = { actifs: 1, total: 2, conseillers: 40, jeunes: 9120, regions: 2 }

describe('GUIC-457/682 — CentresAdminTable', () => {
  it('affiche le titre + sous-titre réseau', () => {
    render(<CentresAdminTable centres={MOCK} stats={STATS} />)
    expect(screen.getByRole('heading', { name: /centres cjs/i })).toBeInTheDocument()
    expect(screen.getByText(/2 centres/i)).toBeInTheDocument()
  })

  it('KPIs réseau : Centres actifs, Conseillers rattachés, Jeunes suivis, Couverture', () => {
    render(<CentresAdminTable centres={MOCK} stats={STATS} />)
    expect(screen.getByText(/centres actifs/i)).toBeInTheDocument()
    expect(screen.getByText(/conseillers rattachés/i)).toBeInTheDocument()
    expect(screen.getByText(/jeunes suivis/i)).toBeInTheDocument()
    expect(screen.getByText(/couverture/i)).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()      // conseillers
    expect(screen.getByText('9 120')).toBeInTheDocument()   // jeunes suivis
  })

  it('carte : 3 stats Staff/Jeunes/Insertion + ouvre la fiche', () => {
    render(<CentresAdminTable centres={MOCK} stats={STATS} />)
    const card = screen.getByRole('link', { name: /fiche de CJS Dakar/i })
    expect(card).toHaveAttribute('href', '/admin/centres/c1')
    expect(within(card).getByText('8 940')).toBeInTheDocument()
    expect(within(card).getByText('42%')).toBeInTheDocument()
  })

  it('bouton "Ajouter un centre" ouvre le formulaire de création', () => {
    render(<CentresAdminTable centres={MOCK} stats={STATS} />)
    fireEvent.click(screen.getByRole('button', { name: /ajouter un centre/i }))
    expect(screen.getByLabelText(/^nom/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/latitude/i)).toBeInTheDocument()
  })

  it('formulaire fidèle maquette : titre "Nouveau centre" + E-mail + Services', () => {
    render(<CentresAdminTable centres={MOCK} stats={STATS} />)
    fireEvent.click(screen.getByRole('button', { name: /ajouter un centre/i }))
    expect(screen.getByRole('heading', { name: /nouveau centre/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ville/i)).toBeInTheDocument()
    // Services segmentés (multi-sélection)
    const svc = screen.getByRole('group', { name: /services/i })
    expect(within(svc).getByRole('button', { name: 'WiFi' })).toBeInTheDocument()
    expect(within(svc).getByRole('button', { name: 'Bibliothèque' })).toBeInTheDocument()
    // CTA principal
    expect(screen.getByRole('button', { name: /créer le centre/i })).toBeInTheDocument()
  })

  it('services : ajout d’un service personnalisé (chaîne libre)', () => {
    render(<CentresAdminTable centres={MOCK} stats={STATS} />)
    fireEvent.click(screen.getByRole('button', { name: /ajouter un centre/i }))
    fireEvent.change(screen.getByLabelText(/autre service/i), { target: { value: 'Salle informatique' } })
    fireEvent.click(screen.getByRole('button', { name: /^ajouter$/i }))
    expect(screen.getByText('Salle informatique')).toBeInTheDocument()
  })

  it('horaires : éditeur 7 jours, Lundi ouvert / Dimanche fermé par défaut', () => {
    render(<CentresAdminTable centres={MOCK} stats={STATS} />)
    fireEvent.click(screen.getByRole('button', { name: /ajouter un centre/i }))
    const grp = screen.getByRole('group', { name: /horaires/i })
    expect(within(grp).getByText('Lundi')).toBeInTheDocument()
    expect(within(grp).getByText('Dimanche')).toBeInTheDocument()
    expect(within(grp).getByRole('button', { name: /lundi : ouvert/i })).toBeInTheDocument()
    expect(within(grp).getByRole('button', { name: /dimanche : fermé/i })).toBeInTheDocument()
  })

  it('filtre "Actifs" masque les centres inactifs', () => {
    render(<CentresAdminTable centres={MOCK} stats={STATS} />)
    expect(screen.getByRole('link', { name: /fiche de CJS Kolda/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Actifs' }))
    expect(screen.queryByRole('link', { name: /fiche de CJS Kolda/i })).toBeNull()
    expect(screen.getByRole('link', { name: /fiche de CJS Dakar/i })).toBeInTheDocument()
  })

  it('recherche filtre par nom/région', () => {
    render(<CentresAdminTable centres={MOCK} stats={STATS} />)
    fireEvent.change(screen.getByLabelText(/rechercher un centre/i), { target: { value: 'kolda' } })
    expect(screen.getByRole('link', { name: /fiche de CJS Kolda/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /fiche de CJS Dakar/i })).toBeNull()
  })

  it('état vide (aucun résultat)', () => {
    render(<CentresAdminTable centres={[]} stats={{ ...STATS, actifs: 0, total: 0 }} />)
    expect(screen.getByText(/aucun centre/i)).toBeInTheDocument()
  })

  it('ne contient pas de hex dur dans le JSX rendu (tokens/rgb var uniquement)', () => {
    const { container } = render(<CentresAdminTable centres={MOCK} stats={STATS} />)
    const styles = Array.from(container.querySelectorAll('[style]')).map((el) => el.getAttribute('style') ?? '').join(' ')
    // Exception : #fff sur avatar (sur fond coloré). On tolère #fff/#ffffff.
    expect(styles.replace(/#fff(fff)?/gi, '')).not.toMatch(/#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/)
  })
})
