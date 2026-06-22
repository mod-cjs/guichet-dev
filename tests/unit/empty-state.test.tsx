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

describe('<EmptyState /> (GUIC-418 — design v2 lot 3)', () => {
  it('rend une illustration SVG inline 120×120 par défaut (search)', () => {
    const { container } = render(<EmptyState title="Aucune opportunité" />)
    const svg = container.querySelector('svg[data-illustration="search"]')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('width')).toBe('120')
    expect(svg?.getAttribute('height')).toBe('120')
  })

  it('rend l\'illustration "inbox" si demandée', () => {
    const { container } = render(<EmptyState title="x" illustration="inbox" />)
    expect(container.querySelector('svg[data-illustration="inbox"]')).toBeTruthy()
  })

  it('rend l\'illustration "error" si demandée', () => {
    const { container } = render(<EmptyState title="x" illustration="error" />)
    expect(container.querySelector('svg[data-illustration="error"]')).toBeTruthy()
  })

  it('accepte plusieurs actions via `actions` (max 2)', () => {
    const cb1 = jest.fn()
    const cb2 = jest.fn()
    render(
      <EmptyState
        title="Vide"
        actions={[
          { label: 'Élargir la région', onClick: cb1, variant: 'outline' },
          { label: 'Réinitialiser', onClick: cb2, variant: 'primary' },
        ]}
      />,
    )
    const b1 = screen.getByRole('button', { name: 'Élargir la région' })
    const b2 = screen.getByRole('button', { name: 'Réinitialiser' })
    expect(b1).toBeInTheDocument()
    expect(b2).toBeInTheDocument()
    b1.click()
    b2.click()
    expect(cb1).toHaveBeenCalledTimes(1)
    expect(cb2).toHaveBeenCalledTimes(1)
  })

  it('reste rétro-compatible avec actionLabel + onAction (mappé en action primary)', () => {
    const onAction = jest.fn()
    render(<EmptyState title="x" actionLabel="Go" onAction={onAction} />)
    const btn = screen.getByRole('button', { name: 'Go' })
    expect(btn).toBeInTheDocument()
    btn.click()
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('n\'utilise pas d\'icône sprite quand `illustration` est fourni (illustration prioritaire)', () => {
    const { container } = render(<EmptyState title="x" illustration="search" icon="calendar" />)
    // illustration prime — pas de <use href="#i-calendar">
    const use = container.querySelector('svg use')
    expect(use).toBeNull()
    expect(container.querySelector('svg[data-illustration="search"]')).toBeTruthy()
  })
})
