import { render, screen } from '@testing-library/react'
import { OpportuniteTypeChip, typeLabel } from '@/components/opportunites/OpportuniteTypeChip'

/**
 * GUIC-689 — code couleur catégories (design v5). Le chip ne rend QUE la
 * catégorie (plus de prop `tone`/`prefix`/`suffix` fusionnant l'urgence dans
 * le même pill — l'urgence vit désormais dans une pastille séparée, cf.
 * `<OppCard />` / `HeroBadge`).
 */
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

  it('applique la famille catégorie Emploi → cat-emploi', () => {
    render(<OpportuniteTypeChip type="Emploi" />)
    const el = screen.getByText('Emploi')
    expect(el).toHaveAttribute('data-cat', 'cat-emploi')
    expect(el.className).toMatch(/bg-cat-emploi-soft/)
    expect(el.className).toMatch(/text-cat-emploi-ink/)
  })

  it('applique la famille catégorie Stage → cat-stage', () => {
    render(<OpportuniteTypeChip type="Stage" />)
    expect(screen.getByText('Stage')).toHaveAttribute('data-cat', 'cat-stage')
  })

  it('applique la famille catégorie Formation → cat-formation', () => {
    render(<OpportuniteTypeChip type="Formation" />)
    expect(screen.getByText('Formation')).toHaveAttribute('data-cat', 'cat-formation')
  })

  it('applique la famille catégorie Bourse → cat-financement', () => {
    render(<OpportuniteTypeChip type="Bourse" />)
    expect(screen.getByText('Bourse')).toHaveAttribute('data-cat', 'cat-financement')
  })

  it('applique la famille catégorie Appel_a_projets → cat-financement', () => {
    render(<OpportuniteTypeChip type="Appel_a_projets" />)
    expect(screen.getByText('Appel à projets')).toHaveAttribute('data-cat', 'cat-financement')
  })

  it('applique la famille catégorie Volontariat → cat-volontariat', () => {
    render(<OpportuniteTypeChip type="Volontariat" />)
    expect(screen.getByText('Volontariat')).toHaveAttribute('data-cat', 'cat-volontariat')
  })

  it('ne porte plus jamais de ton rouge sur le chip (urgence = pastille séparée ailleurs)', () => {
    render(<OpportuniteTypeChip type="Stage" />)
    const el = screen.getByText('Stage')
    expect(el).not.toHaveAttribute('data-tone')
    expect(el.className).not.toMatch(/bg-gj-red/)
    // Le chip ne rend que le libellé de catégorie, jamais de suffixe fusionné (ex. « · J-3 »).
    expect(el.textContent).toBe('Stage')
  })

  it('rend un span non-interactif (pas de role button)', () => {
    render(<OpportuniteTypeChip type="Emploi" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
