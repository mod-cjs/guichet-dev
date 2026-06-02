import { render, screen } from '@testing-library/react'
import { OpportuniteTypeChip, typeLabel } from '@/components/opportunites/OpportuniteTypeChip'

describe('<OpportuniteTypeChip />', () => {
  it('rend le libellé humanisé du type', () => {
    render(<OpportuniteTypeChip type="Appel_a_projets" />)
    expect(screen.getByText('Appel à projets')).toBeInTheDocument()
  })

  it('humanise les autres types avec espaces', () => {
    expect(typeLabel('Emploi')).toBe('Emploi')
    expect(typeLabel('Stage')).toBe('Stage')
    expect(typeLabel('Appel_a_projets')).toBe('Appel à projets')
  })

  it('applique la sectorisation par défaut (Emploi → teal)', () => {
    render(<OpportuniteTypeChip type="Emploi" />)
    const el = screen.getByText('Emploi')
    expect(el).toHaveAttribute('data-tone', 'teal')
    expect(el.className).toMatch(/bg-gj-teal-soft/)
  })

  it('applique la sectorisation Bourse → yellow', () => {
    render(<OpportuniteTypeChip type="Bourse" />)
    expect(screen.getByText('Bourse')).toHaveAttribute('data-tone', 'yellow')
  })

  it('applique la sectorisation Formation → blue', () => {
    render(<OpportuniteTypeChip type="Formation" />)
    expect(screen.getByText('Formation')).toHaveAttribute('data-tone', 'blue')
  })

  it('applique la sectorisation Volontariat → green', () => {
    render(<OpportuniteTypeChip type="Volontariat" />)
    expect(screen.getByText('Volontariat')).toHaveAttribute('data-tone', 'green')
  })

  it("override par la prop tone (urgence rouge)", () => {
    render(<OpportuniteTypeChip type="Stage" tone="red" suffix="J-3" />)
    const el = screen.getByText(/Stage · J-3/)
    expect(el).toHaveAttribute('data-tone', 'red')
    expect(el.className).toMatch(/bg-gj-red-soft/)
  })

  it('rend un span non-interactif (pas de role button)', () => {
    render(<OpportuniteTypeChip type="Emploi" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
