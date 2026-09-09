import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('<Button />', () => {
  it('rend un bouton avec le texte fourni', () => {
    render(<Button>Envoyer</Button>)
    expect(screen.getByRole('button', { name: /envoyer/i })).toBeInTheDocument()
  })

  it('appelle onClick au clic', () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Go</Button>)
    fireEvent.click(screen.getByRole('button', { name: /go/i }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ne déclenche pas onClick quand disabled', () => {
    const onClick = jest.fn()
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('désactive le bouton et affiche le spinner quand loading=true', () => {
    const onClick = jest.fn()
    const { container } = render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    )
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
    expect(container.querySelector('.animate-spin')).not.toBeNull()
  })

  it('applique la variant danger', () => {
    render(<Button variant="danger">Supprimer</Button>)
    expect(screen.getByRole('button').className).toMatch(/bg-gj-red/)
  })

  it('respecte les hit-targets selon size', () => {
    const { rerender } = render(<Button size="sm">x</Button>)
    expect(screen.getByRole('button').className).toMatch(/min-h-\[var\(--tap-min\)\]/)
    rerender(<Button size="lg">x</Button>)
    expect(screen.getByRole('button').className).toMatch(/min-h-\[var\(--tap-comfortable\)\]/)
  })

  // GUIC-689 / GUIC-691 — CTA de conversion magenta : `conversion` est le SEUL
  // variant qui porte `--gj-action` (via la classe `.gj-cta` de tokens.css).
  // `primary` reste teal (navigation / action générique). Les deux tickets ont
  // implémenté la même règle en parallèle ; le nom retenu est celui de GUIC-691.
  it('applique la variant conversion (magenta de conversion)', () => {
    render(<Button variant="conversion">Postuler</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/\bgj-cta\b/)
    // La classe ne doit pas être écrasée par les tailles génériques : `.gj-cta`
    // porte déjà hauteur de cible, padding et graisse.
    expect(btn.className).not.toMatch(/min-h-\[var\(--tap-min\)\]/)
  })

  it('la variant primary reste teal — jamais magenta (une seule conversion par écran)', () => {
    render(<Button variant="primary">Continuer</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/bg-gj-teal(?!-)/)
    expect(btn.className).not.toMatch(/gj-action/)
  })
})
