/**
 * GUIC-457 — AdminCentres Lot 11 (sombre + doré)
 * Tests RED : assertions sur la table centres admin design v3.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Server actions (prisma/auth) mockées au niveau unitaire — intégration réelle
// prouvée dans tests/integration/admin-centres-actions.test.ts.
const mockCreer = jest.fn()
const mockModifier = jest.fn()
const mockSupprimer = jest.fn()
jest.mock('@/app/admin/centres/actions', () => ({
  creerCentre: (...a: unknown[]) => mockCreer(...a),
  modifierCentre: (...a: unknown[]) => mockModifier(...a),
  supprimerCentre: (...a: unknown[]) => mockSupprimer(...a),
}))

import { CentresAdminTable, type CentreRow } from '@/app/admin/centres/centres-admin-table'

// --- données mock ---
const MOCK_CENTRES: CentreRow[] = [
  {
    id: 'c1',
    nom: 'Centre de Dakar',
    region: 'Dakar',
    adresse: '12 rue de Thiong, Dakar',
    latitude: 14.7,
    longitude: -17.45,
    telephone: '+221770000001',
    estActif: true,
    conseillersCount: 4,
    responsable: 'Fatou Diallo',
    ville: 'Dakar',
    createdAt: new Date('2024-01-01'),
    _count: { profilsRattaches: 542, agents: 7 },
  },
  {
    id: 'c2',
    nom: 'Centre de Thiès',
    region: 'Thies',
    adresse: '5 avenue Léopold Sédar Senghor, Thiès',
    latitude: 14.79,
    longitude: -16.93,
    telephone: '+221770000002',
    estActif: true,
    conseillersCount: 2,
    responsable: 'Moussa Diop',
    ville: 'Thiès',
    createdAt: new Date('2024-02-01'),
    _count: { profilsRattaches: 213, agents: 3 },
  },
]

beforeEach(() => {
  mockCreer.mockReset()
  mockModifier.mockReset()
  mockSupprimer.mockReset()
})

describe('GUIC-457 — CentresAdminTable Lot 11', () => {
  /* ── En-têtes de colonnes ───────────────────────────────────────────────── */
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

  it('affiche les en-têtes de colonnes', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    expect(screen.getByText(/^centre$/i)).toBeInTheDocument()
    // "Jeunes" apparaît plusieurs fois (header + mobile) — on vérifie juste sa présence
    expect(screen.getAllByText(/^jeunes$/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/^agents$/i).length).toBeGreaterThan(0)
  })

  /* ── Ligne de données ───────────────────────────────────────────────────── */
  it('affiche le nom du premier centre', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    // Nom apparaît dans le tableau desktop ET dans les cartes mobile
    expect(screen.getAllByText('Centre de Dakar').length).toBeGreaterThan(0)
  })

  it('affiche le label de région du premier centre', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    // Dakar → 'Dakar'
    expect(screen.getAllByText('Dakar').length).toBeGreaterThan(0)
  })

  it('affiche le nombre de jeunes formaté fr-FR', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    // 542 en fr-FR
    expect(screen.getByText('542')).toBeInTheDocument()
  })

  it('affiche le nombre d\'agents', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('affiche "—" pour insertions/mois (pas de champ source)', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    // au moins une occurrence de "—"
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('affiche les boutons d\'action settings et supprimer', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    expect(screen.getAllByRole('button', { name: /modifier/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /supprimer/i }).length).toBeGreaterThan(0)
  })

  /* ── État vide ──────────────────────────────────────────────────────────── */
  it('affiche "Aucun centre" si la liste est vide', () => {
    render(<CentresAdminTable centres={[]} total={0} />)
    // Desktop + mobile rendent chacun un message vide
    expect(screen.getAllByText(/aucun centre/i).length).toBeGreaterThan(0)
  })

  /* ── Règle no-hex ──────────────────────────────────────────────────────── */
  it('ne contient pas de valeurs hex dures dans le JSX rendu (var CSS uniquement)', () => {
    const { container } = render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    // Vérifie qu'aucun attribut style inline ne contient de hex brut (#XXX ou #XXXXXX)
    // Exception admise : #i-xxx dans href SVG (sprite)
    const styles = Array.from(container.querySelectorAll('[style]'))
      .map((el) => el.getAttribute('style') ?? '')
      .join(' ')
    // Les seules couleurs autorisées inline sont via var(--gj-*)
    // Hex hors sprite = violation (hors valeurs attendues du mock)
    expect(styles).not.toMatch(/#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/g)
  })

  /* ── Régression Ce1 — doublon desktop/mobile (audit Playwright 2026-06-23) ── */
  // Bug : les blocs desktop/mobile utilisaient des classes custom sans CSS
  // (`admin-centres-table--*`) → aucune media query → les DEUX s'affichaient en
  // desktop. Sentinelle : exiger les utilitaires responsive Tailwind réels.
  it('given le rendu, then le bloc desktop est `hidden md:block` et les cartes mobile `md:hidden` (anti-doublon)', () => {
    const { container } = render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    const desktop = container.querySelector('[aria-label="Liste des centres CJS"]') as HTMLElement | null
    const mobile = container.querySelector('[aria-label="Liste des centres (vue mobile)"]') as HTMLElement | null
    expect(desktop).toBeTruthy()
    expect(mobile).toBeTruthy()
    // Desktop : caché en mobile, affiché ≥ md
    expect(desktop!.className).toMatch(/(^|\s)hidden(\s|$)/)
    expect(desktop!.className).toMatch(/md:block/)
    // Cartes mobile : cachées ≥ md (sinon doublon en desktop = le bug)
    expect(mobile!.className).toMatch(/md:hidden/)
  })

  /* ── CRUD (GUIC-464) ──────────────────────────────────────────────────── */
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
