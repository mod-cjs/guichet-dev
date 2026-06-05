import { render, screen } from '@testing-library/react'
import { SkipLink } from '@/components/ui/SkipLink'

describe('<SkipLink />', () => {
  it('rend un lien pointant vers #main par défaut', () => {
    render(<SkipLink />)
    const link = screen.getByRole('link', { name: /aller au contenu principal/i })
    expect(link).toHaveAttribute('href', '#main')
  })

  it('accepte une cible et un libellé personnalisés', () => {
    render(<SkipLink href="#contenu">Passer au contenu</SkipLink>)
    const link = screen.getByRole('link', { name: /passer au contenu/i })
    expect(link).toHaveAttribute('href', '#contenu')
  })

  it('est masqué par défaut (sr-only) mais devient visible au focus', () => {
    render(<SkipLink />)
    const link = screen.getByRole('link')
    // Classe sr-only présente — invisible au repos.
    expect(link.className).toMatch(/sr-only/)
    // Classe focus:not-sr-only — révélée au focus clavier.
    expect(link.className).toMatch(/focus:not-sr-only/)
  })
})
