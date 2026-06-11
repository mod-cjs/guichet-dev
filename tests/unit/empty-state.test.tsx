/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { EmptyState } from '@/components/ui/EmptyState'

describe('<EmptyState /> (GUIC-201 — refactor emoji → icon)', () => {
  it('rend titre et description', () => {
    render(<EmptyState title="Rien ici" description="Reviens plus tard" />)
    expect(screen.getByText('Rien ici')).toBeInTheDocument()
    expect(screen.getByText(/reviens plus tard/i)).toBeInTheDocument()
  })

  it('utilise l\'icône sprite par défaut "sparkle" — pas d\'emoji', () => {
    const { container } = render(<EmptyState title="x" />)
    // Sprite SVG injecté par <Icon /> — pas de caractère emoji littéral
    const text = container.textContent || ''
    const forbidden = ['🌱', '📅', '📚', '🔍', '👤']
    forbidden.forEach(e => expect(text).not.toContain(e))
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('accepte une prop icon personnalisée du sprite', () => {
    const { container } = render(<EmptyState icon="calendar" title="x" />)
    const useEl = container.querySelector('svg use')
    expect(useEl?.getAttribute('href')).toContain('calendar')
  })

  it('affiche un bouton action si actionLabel + onAction', () => {
    const onAction = jest.fn()
    render(<EmptyState title="x" actionLabel="Go" onAction={onAction} />)
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument()
  })

  it('n\'affiche pas de bouton si actionLabel manquant', () => {
    render(<EmptyState title="x" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
