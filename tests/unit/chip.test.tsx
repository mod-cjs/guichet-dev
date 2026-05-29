import { render, screen, fireEvent } from '@testing-library/react'
import { Chip } from '@/components/ui/Chip'

describe('<Chip />', () => {
  it('rend un <button> par défaut avec aria-pressed=false', () => {
    render(<Chip>Agriculture</Chip>)
    const btn = screen.getByRole('button', { name: /agriculture/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('passe aria-pressed=true quand selected', () => {
    render(<Chip selected>Dakar</Chip>)
    expect(screen.getByRole('button', { name: /dakar/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('appelle onClick au clic', () => {
    const onClick = jest.fn()
    render(<Chip onClick={onClick}>Filtre</Chip>)
    fireEvent.click(screen.getByRole('button', { name: /filtre/i }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('affiche un bouton de suppression accessible et déclenche onRemove sans propager le clic principal', () => {
    const onClick = jest.fn()
    const onRemove = jest.fn()
    render(
      <Chip removable onRemove={onRemove} onClick={onClick} selected>
        Dakar
      </Chip>,
    )
    const remove = screen.getByRole('button', { name: /retirer dakar/i })
    fireEvent.click(remove)
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('ne crée pas de bouton imbriqué quand removable (a11y HTML)', () => {
    // Refactor GUIC-175 : 2 buttons sibling dans un span role=group,
    // au lieu d'un <button> contenant un span role=button (interdit par HTML).
    const { container } = render(
      <Chip removable onRemove={jest.fn()}>
        Dakar
      </Chip>,
    )
    expect(container.querySelector('button button')).toBeNull()
    expect(container.querySelector('[role="group"]')).not.toBeNull()
  })

  it('rend une icône à gauche si icon est fourni', () => {
    const { container } = render(<Chip icon="agriculture">Agri</Chip>)
    const use = container.querySelector('use[href="/icons.svg#i-agriculture"]')
    expect(use).not.toBeNull()
  })

  it('respecte la hit-target min 42px', () => {
    render(<Chip>Test</Chip>)
    const btn = screen.getByRole('button', { name: /test/i })
    expect(btn.className).toMatch(/min-h-\[42px\]/)
  })
})
