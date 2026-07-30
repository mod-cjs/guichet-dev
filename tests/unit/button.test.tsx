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

  // GUIC-689 — CTA de conversion magenta : `cta` est le SEUL variant qui porte
  // `--gj-action`. `primary` reste teal (navigation/action générique).
  it('applique la variant cta (magenta de conversion)', () => {
    render(<Button variant="cta">Postuler</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/bg-gj-action(?!-)/)
    expect(btn.className).toMatch(/hover:bg-gj-action-deep/)
  })

  it('la variant primary reste teal — jamais magenta (une seule cta par écran)', () => {
    render(<Button variant="primary">Continuer</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/bg-gj-teal(?!-)/)
    expect(btn.className).not.toMatch(/gj-action/)
  })
})
