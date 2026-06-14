/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { CentreDescriptionSection } from '@/components/centres/CentreDescriptionSection'

describe('<CentreDescriptionSection />', () => {
  it('rend le titre "À propos" et la description avec line-breaks préservés', () => {
    render(
      <CentreDescriptionSection description={'Ligne 1\nLigne 2'} />,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: /À propos/i }),
    ).toBeInTheDocument()
    const p = screen.getByText(/Ligne 1/)
    expect(p.tagName).toBe('P')
    expect(p.getAttribute('style')).toMatch(/white-space:\s*pre-line/i)
    expect(p.textContent).toContain('Ligne 2')
  })

  it('ne rend rien si description nulle ou vide', () => {
    const { container, rerender } = render(
      <CentreDescriptionSection description={null} />,
    )
    expect(container.firstChild).toBeNull()
    rerender(<CentreDescriptionSection description="   " />)
    expect(container.firstChild).toBeNull()
  })
})
