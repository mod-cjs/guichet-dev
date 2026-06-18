/**
 * @jest-environment jsdom
 *
 * F-02 + F-03 — Centre principal : DS Select + StepBar + pas de double <main>.
 * [GUIC-429] RED
 */
import { render, screen } from '@testing-library/react'
import { CentrePrincipalForm } from '@/app/jeune/onboarding/centre-principal/centre-principal-form'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

const CENTRES = [
  { id: 'c1', nom: 'CJS Dakar', region: 'Dakar', ville: 'Dakar' },
  { id: 'c2', nom: 'CJS Thiès', region: 'Thiès', ville: 'Thiès' },
]

describe('F-02 — CentrePrincipalForm — DS Select (pas de <select> natif brut)', () => {
  it('rend un combobox accessible pour le choix du centre', () => {
    render(<CentrePrincipalForm centres={CENTRES} suggestedId={null} userRegion={null} />)
    const combo = screen.getByRole('combobox', { name: /centre cjs/i })
    expect(combo).toBeInTheDocument()
  })

  it('liste les centres comme options', () => {
    render(<CentrePrincipalForm centres={CENTRES} suggestedId={null} userRegion={null} />)
    expect(screen.getByRole('option', { name: /CJS Dakar/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /CJS Thiès/i })).toBeInTheDocument()
  })

  it('ne contient PAS de hex en dur dans le rendu', () => {
    const { container } = render(<CentrePrincipalForm centres={CENTRES} suggestedId={null} userRegion={null} />)
    // Vérifie que les attributs style ne contiennent pas de valeurs hex couleur brutes
    const allStyled = container.querySelectorAll('[style]')
    allStyled.forEach(el => {
      const style = (el as HTMLElement).getAttribute('style') ?? ''
      // exclure rgba/rgb (tolérés), chercher #XXXXXX ou #XXX non prefixés gj-
      expect(style).not.toMatch(/#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/)
    })
  })
})

describe('F-03 — CentrePrincipalForm — StepBar présent, pas de double <main>', () => {
  it('affiche une StepBar (progressbar)', () => {
    render(<CentrePrincipalForm centres={CENTRES} suggestedId={null} userRegion={null} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('le step de centre-principal est 4 sur 5', () => {
    render(<CentrePrincipalForm centres={CENTRES} suggestedId={null} userRegion={null} />)
    const bar = screen.getByRole('progressbar')
    // StepBar rend aria-valuenow={step} aria-valuemax={total}
    expect(bar).toHaveAttribute('aria-valuenow', '4')
    expect(bar).toHaveAttribute('aria-valuemax', '5')
  })

  it('ne rend PAS un élément <main> (le layout parent le fournit)', () => {
    const { container } = render(<CentrePrincipalForm centres={CENTRES} suggestedId={null} userRegion={null} />)
    const mains = container.querySelectorAll('main')
    expect(mains).toHaveLength(0)
  })
})
