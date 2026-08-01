import { render, screen } from '@testing-library/react'
import { Avatar } from '@/components/ui/Avatar'

/**
 * GUIC-689 — Lot C2.4 : dégradé par rôle (`tone`) + pastille de présence
 * (`online`), réf. `component-kit.jsx` `av()`. Défaut inchangé (fond plat
 * `bg-gj-teal`) pour ne casser aucun call site existant.
 */
describe('<Avatar />', () => {
  it('applique un fond plat par défaut, sans dégradé (rendu inchangé)', () => {
    const { container } = render(<Avatar prenom="Awa" nom="Diop" />)
    const inner = container.querySelector('.rounded-full') as HTMLElement
    expect(inner).not.toBeNull()
    expect(inner.className).toMatch(/bg-gj-teal\b/)
    expect(inner.className).not.toMatch(/gradient/)
  })

  it.each([
    ['jeune', 'from-gj-teal', 'to-gj-teal-deep'],
    ['recruteur', 'from-gj-blue', 'to-gj-blue-ink'],
    ['agent', 'from-gj-yellow', 'to-gj-yellow-deep'],
  ] as const)('tone=%s applique le dégradé %s → %s', (tone, from, to) => {
    const { container } = render(<Avatar prenom="A" nom="B" tone={tone} />)
    const inner = container.querySelector('.rounded-full') as HTMLElement
    expect(inner.className).toMatch(new RegExp(from))
    expect(inner.className).toMatch(new RegExp(to))
  })

  it('affiche une pastille de présence quand online', () => {
    render(<Avatar prenom="A" nom="B" online />)
    expect(screen.getByLabelText('En ligne')).toBeInTheDocument()
  })

  it("n'affiche aucune pastille par défaut", () => {
    render(<Avatar prenom="A" nom="B" />)
    expect(screen.queryByLabelText('En ligne')).not.toBeInTheDocument()
  })
})
