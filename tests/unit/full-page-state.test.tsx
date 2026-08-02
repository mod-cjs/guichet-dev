/**
 * @jest-environment jsdom
 *
 * GUIC-689 (Lot D3) : `<FullPageState />` — miroir du `StateBlock` v5
 * (`design-guichet-v5/system-states.jsx` L23-38). Icône en pastille tonale,
 * titre, corps, 1 à 2 actions empilées pleine largeur.
 */
import { render, screen } from '@testing-library/react'
import { FullPageState } from '@/components/ui/FullPageState'

describe('<FullPageState /> (GUIC-689 — Lot 13, StateBlock)', () => {
  it('rend icône (sprite), titre et corps', () => {
    const { container } = render(
      <FullPageState icon="alert" tone="red" title="Oups" body="Un souci est survenu" />,
    )
    expect(screen.getByText('Oups')).toBeInTheDocument()
    expect(screen.getByText('Un souci est survenu')).toBeInTheDocument()
    const use = container.querySelector('svg use')
    expect(use?.getAttribute('href')).toBe('/icons.svg#i-alert')
  })

  it('rend une action primaire en bouton plein-largeur (onClick)', () => {
    const onClick = jest.fn()
    render(<FullPageState icon="globe" tone="grey" title="x" primaryAction={{ label: 'Réessayer', onClick }} />)
    const btn = screen.getByRole('button', { name: 'Réessayer' })
    btn.click()
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(btn.className).toMatch(/w-full/)
  })

  it('rend une action secondaire en lien plein-largeur (href)', () => {
    render(
      <FullPageState
        icon="globe"
        tone="grey"
        title="x"
        secondaryAction={{ label: 'Accueil', href: '/jeune/tableau-de-bord' }}
      />,
    )
    const link = screen.getByRole('link', { name: 'Accueil' })
    expect(link).toHaveAttribute('href', '/jeune/tableau-de-bord')
    expect(link.className).toMatch(/w-full/)
  })

  it("n'affiche aucun bouton ni lien si aucune action fournie", () => {
    render(<FullPageState icon="globe" tone="teal" title="x" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it.each(['red', 'grey', 'teal', 'yellow'] as const)('accepte le tone "%s" sans planter', (tone) => {
    expect(() => render(<FullPageState icon="alert" tone={tone} title="x" />)).not.toThrow()
  })
})
