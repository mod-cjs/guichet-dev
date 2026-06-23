/**
 * GUIC-457 — AdminCentres Lot 11 (sombre + doré)
 * Tests RED : assertions sur la table centres admin design v3.
 */
import { render, screen } from '@testing-library/react'
import { CentresAdminTable } from '@/app/admin/centres/centres-admin-table'

// --- données mock ---
const MOCK_CENTRES = [
  {
    id: 'c1',
    nom: 'Centre de Dakar',
    region: 'Dakar' as const,
    adresse: '12 rue de Thiong, Dakar',
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
    region: 'Thies' as const,
    adresse: '5 avenue Léopold Sédar Senghor, Thiès',
    estActif: true,
    conseillersCount: 2,
    responsable: 'Moussa Diop',
    ville: 'Thiès',
    createdAt: new Date('2024-02-01'),
    _count: { profilsRattaches: 213, agents: 3 },
  },
]

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
    expect(screen.getByText(/jeunes/i)).toBeInTheDocument()
    expect(screen.getByText(/agents/i)).toBeInTheDocument()
  })

  /* ── Ligne de données ───────────────────────────────────────────────────── */
  it('affiche le nom du premier centre', () => {
    render(<CentresAdminTable centres={MOCK_CENTRES} total={2} />)
    expect(screen.getByText('Centre de Dakar')).toBeInTheDocument()
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
    expect(screen.getByText(/aucun centre/i)).toBeInTheDocument()
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
})
