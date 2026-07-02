import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Les server actions (prisma/auth) sont mockées au niveau unitaire — l'intégration
// réelle est prouvée dans tests/integration/admin-moderation-actions.test.ts.
const mockApprouver = jest.fn()
const mockRejeter = jest.fn()
jest.mock('@/app/admin/opportunites/actions', () => ({
  approuverOpportunite: (...a: unknown[]) => mockApprouver(...a),
  rejeterOpportunite: (...a: unknown[]) => mockRejeter(...a),
}))

import {
  AdminModerationList,
  type ModerationItem,
} from '@/app/admin/opportunites/AdminModerationList'

beforeEach(() => {
  mockApprouver.mockReset()
  mockRejeter.mockReset()
})

const ITEMS: ModerationItem[] = [
  {
    id: 'o1',
    slug: 'developpeur-full-stack',
    titre: 'Développeur full-stack',
    typeLabel: 'Emploi',
    organisation: 'Sonatel',
    dateLabel: 'il y a 2 jours',
  },
  {
    id: 'o2',
    slug: 'bourse-mobilite-2026',
    titre: 'Bourse de mobilité 2026',
    typeLabel: 'Bourse',
    organisation: 'CJS',
    dateLabel: 'il y a 5 jours',
  },
]

describe('GUIC-453 — AdminModerationList (file brouillon, sans verdict IA)', () => {
  it('affiche le titre "Modération" et le compteur', () => {
    render(<AdminModerationList items={ITEMS} total={2} />)
    expect(screen.getByRole('heading', { name: /modération/i })).toBeInTheDocument()
    expect(screen.getByText(/2 publications en attente/i)).toBeInTheDocument()
  })

  it('affiche le titre, l\'organisation et le type d\'une publication', () => {
    render(<AdminModerationList items={ITEMS} total={2} />)
    expect(screen.getByText('Développeur full-stack')).toBeInTheDocument()
    expect(screen.getByText(/Sonatel/)).toBeInTheDocument()
    expect(screen.getAllByText('Emploi').length).toBeGreaterThan(0)
  })

  it('affiche les actions Approuver / Rejeter sur chaque carte', () => {
    render(<AdminModerationList items={ITEMS} total={2} />)
    expect(screen.getAllByRole('button', { name: /approuver/i }).length).toBe(2)
    expect(screen.getAllByRole('button', { name: /rejeter/i }).length).toBe(2)
  })

  it('ne fabrique AUCUN verdict IA (pas de score de conformité)', () => {
    render(<AdminModerationList items={ITEMS} total={2} />)
    expect(screen.queryByTestId('ai-verdict')).toBeNull()
    expect(screen.queryByText(/conforme à \d+%/i)).toBeNull()
  })

  it('affiche un état vide quand la file est vide', () => {
    render(<AdminModerationList items={[]} total={0} />)
    expect(screen.getByText(/Aucune publication en attente/i)).toBeInTheDocument()
  })

  /* ── Câblage des actions (GUIC-462) — MOD-02 : confirmation requise ────────── */
  it('given clic Approuver CONFIRMÉ, then appelle approuverOpportunite(id)', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AdminModerationList items={ITEMS} total={2} />)
    await userEvent.setup().click(screen.getAllByRole('button', { name: /approuver/i })[0])
    expect(mockApprouver).toHaveBeenCalledWith('o1')
    expect(mockRejeter).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  // MOD-02 — sans confirmation, l'action irréversible NE part PAS.
  it('given clic Approuver ANNULÉ, then n\'appelle pas approuverOpportunite', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AdminModerationList items={ITEMS} total={2} />)
    await userEvent.setup().click(screen.getAllByRole('button', { name: /approuver/i })[0])
    expect(mockApprouver).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  // M-M2 — le rejet capture un motif (prompt) transmis à l'action.
  it('given clic Rejeter avec motif, then appelle rejeterOpportunite(id, motif)', async () => {
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('Hors charte')
    render(<AdminModerationList items={ITEMS} total={2} />)
    await userEvent.setup().click(screen.getAllByRole('button', { name: /rejeter/i })[0])
    expect(mockRejeter).toHaveBeenCalledWith('o1', 'Hors charte')
    expect(mockApprouver).not.toHaveBeenCalled()
    promptSpy.mockRestore()
  })

  it('given clic Rejeter ANNULÉ (prompt null), then n\'appelle pas rejeterOpportunite', async () => {
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue(null)
    render(<AdminModerationList items={ITEMS} total={2} />)
    await userEvent.setup().click(screen.getAllByRole('button', { name: /rejeter/i })[0])
    expect(mockRejeter).not.toHaveBeenCalled()
    promptSpy.mockRestore()
  })

  // MOD-01 — l'Aperçu pointe vers la route admin (brouillon visible), pas la page
  // publique (qui renvoie 404 pour un non-publié).
  it('le lien Aperçu pointe vers la route admin /admin/opportunites/<id>/apercu', () => {
    render(<AdminModerationList items={ITEMS} total={2} />)
    const apercu = screen.getAllByRole('link', { name: /aperçu/i })[0]
    expect(apercu).toHaveAttribute('href', '/admin/opportunites/o1/apercu')
  })

  // GUIC-471 — édition/publication directe depuis la file de modération.
  it('propose un lien « Éditer et publier » vers le formulaire d\'édition', () => {
    render(<AdminModerationList items={ITEMS} total={2} />)
    const edit = screen.getAllByRole('link', { name: /éditer et publier/i })[0]
    expect(edit).toHaveAttribute('href', '/admin/opportunites/o1/modifier')
  })
})
