/**
 * GUIC-457 / GUIC-682 — CentresAdminTable : grille de cartes « letterhead ».
 * (Refonte registre : la table desktop + cartes mobiles ont été remplacées par
 *  une grille unique responsive de CentreCard.)
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockCreer = jest.fn()
const mockModifier = jest.fn()
const mockSupprimer = jest.fn()
jest.mock('@/app/admin/centres/actions', () => ({
  creerCentre: (...a: unknown[]) => mockCreer(...a),
  modifierCentre: (...a: unknown[]) => mockModifier(...a),
  supprimerCentre: (...a: unknown[]) => mockSupprimer(...a),
}))

import { CentresAdminTable, type CentreRow } from '@/app/admin/centres/centres-admin-table'

const MOCK_CENTRES: CentreRow[] = [
  {
    id: 'c1', nom: 'Centre de Dakar', region: 'Dakar', adresse: '12 rue de Thiong, Dakar',
    latitude: 14.7, longitude: -17.45, telephone: '+221770000001', estActif: true,
    conseillersCount: 4, responsable: 'Fatou Diallo', ville: 'Dakar', createdAt: new Date('2024-01-01'),
    _count: { profilsRattaches: 542, agents: 7 },
  },
  {
    id: 'c2', nom: 'Centre de Thiès', region: 'Thies', adresse: '5 avenue LSS, Thiès',
    latitude: 14.79, longitude: -16.93, telephone: '+221770000002', estActif: true,
    conseillersCount: 2, responsable: 'Moussa Diop', ville: 'Thiès', createdAt: new Date('2024-02-01'),
    _count: { profilsRattaches: 213, agents: 3 },
  },
]

beforeEach(() => {
  mockCreer.mockReset()
  mockModifier.mockReset()
  mockSupprimer.mockReset()
})

describe('GUIC-457/682 — CentresAdminTable (grille de cartes)', () => {
  it('affiche le titre "Centres CJS"', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    expect(screen.getByRole('heading', { name: /centres cjs/i })).toBeInTheDocument()
  })

  it('affiche le sous-titre avec le total de centres', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    expect(screen.getByText(/2 centres/i)).toBeInTheDocument()
  })

  it('rend le bouton "Ajouter un centre"', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    expect(screen.getByRole('button', { name: /ajouter un centre/i })).toBeInTheDocument()
  })

  it('chaque carte porte les stats Jeunes / Agents', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    expect(screen.getAllByText(/^jeunes$/i).length).toBe(MOCK_CENTRES.length)
    expect(screen.getAllByText(/^agents$/i).length).toBe(MOCK_CENTRES.length)
  })

  it('affiche le nom, la région et les compteurs du premier centre', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    expect(screen.getByText('Centre de Dakar')).toBeInTheDocument()
    expect(screen.getByText('Dakar')).toBeInTheDocument()
    expect(screen.getByText('542')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('ne présente plus les colonnes mortes Insertions/mois et Taux d\'insertion', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    expect(screen.queryByText(/insertions\/mois/i)).toBeNull()
    expect(screen.queryByText(/taux d.insertion/i)).toBeNull()
  })

  it('expose Modifier + Supprimer par carte', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    expect(screen.getAllByRole('button', { name: /modifier/i }).length).toBe(MOCK_CENTRES.length)
    expect(screen.getAllByRole('button', { name: /supprimer/i }).length).toBe(MOCK_CENTRES.length)
  })

  it('lien Ressources par carte', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    expect(screen.getAllByRole('link', { name: /ressources/i })[0]).toHaveAttribute('href', '/admin/centres/c1?tab=ressources')
  })

  // C1 — la modale d'édition s'ouvre PRÉ-REMPLIE (sentinelle key={editCentre?.id}).
  it('pré-remplit la modale d\'édition avec les valeurs du centre (anti-régression C1)', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    fireEvent.click(screen.getAllByRole('button', { name: /modifier/i })[0])
    expect((screen.getByLabelText(/^nom/i) as HTMLInputElement).value).toBe('Centre de Dakar')
    expect((screen.getByLabelText(/téléphone/i) as HTMLInputElement).value).toBe('+221770000001')
  })

  it('affiche un message d\'erreur si la suppression échoue (CENTRE_NON_VIDE)', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    mockSupprimer.mockRejectedValueOnce(new Error('CENTRE_NON_VIDE'))
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    fireEvent.click(screen.getAllByRole('button', { name: /supprimer/i })[0])
    await waitFor(() => expect(screen.getByText(/jeunes ou agents y sont rattachés/i)).toBeInTheDocument())
    confirmSpy.mockRestore()
  })

  it('affiche un toast de succès après suppression réussie', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    mockSupprimer.mockResolvedValueOnce({ ok: true })
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    fireEvent.click(screen.getAllByRole('button', { name: /supprimer/i })[0])
    await waitFor(() => expect(screen.getByText(/supprimé/i)).toBeInTheDocument())
    confirmSpy.mockRestore()
  })

  it('affiche "Aucun centre" si la liste est vide', () => {
    render(<CentresAdminTable centres={[]} total={0} />)
    expect(screen.getByText(/aucun centre/i)).toBeInTheDocument()
  })

  it('ne contient pas de valeurs hex dures dans le JSX rendu (var CSS uniquement)', () => {
    const { container } = render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    const styles = Array.from(container.querySelectorAll('[style]')).map((el) => el.getAttribute('style') ?? '').join(' ')
    expect(styles).not.toMatch(/#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/g)
  })

  it('given clic "Ajouter un centre", then ouvre le formulaire de création', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    fireEvent.click(screen.getByRole('button', { name: /ajouter un centre/i }))
    expect(screen.getByLabelText(/^nom/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/latitude/i)).toBeInTheDocument()
  })

  it('given clic Supprimer + confirmation, then appelle supprimerCentre(id)', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    fireEvent.click(screen.getAllByRole('button', { name: /supprimer/i })[0])
    await waitFor(() => expect(mockSupprimer).toHaveBeenCalledWith('c1'))
    confirmSpy.mockRestore()
  })

  it('given clic Supprimer SANS confirmation, then n\'appelle pas supprimerCentre', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    fireEvent.click(screen.getAllByRole('button', { name: /supprimer/i })[0])
    expect(mockSupprimer).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('given clic Modifier, then ouvre le formulaire pré-rempli (Enregistrer)', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    fireEvent.click(screen.getAllByRole('button', { name: /modifier/i })[0])
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument()
  })
})
