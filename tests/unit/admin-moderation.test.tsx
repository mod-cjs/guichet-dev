import { render, screen } from '@testing-library/react'
import {
  AdminModerationList,
  type ModerationItem,
} from '@/app/admin/opportunites/AdminModerationList'

const ITEMS: ModerationItem[] = [
  {
    id: 'o1',
    titre: 'Développeur full-stack',
    typeLabel: 'Emploi',
    organisation: 'Sonatel',
    dateLabel: 'il y a 2 jours',
  },
  {
    id: 'o2',
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
})
