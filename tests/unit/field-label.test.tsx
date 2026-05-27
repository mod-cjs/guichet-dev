import { render, screen } from '@testing-library/react'
import { FieldLabel } from '@/components/ui/FieldLabel'

describe('<FieldLabel />', () => {
  it('rend un <label> avec htmlFor correct', () => {
    const { container } = render(<FieldLabel htmlFor="phone">Téléphone</FieldLabel>)
    const label = container.querySelector('label')!
    expect(label).toBeInTheDocument()
    expect(label.getAttribute('for')).toBe('phone')
  })

  it('affiche un astérisque rouge + texte SR si required', () => {
    render(
      <FieldLabel htmlFor="email" required>
        Email
      </FieldLabel>,
    )
    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByText('(requis)', { exact: false })).toBeInTheDocument()
  })

  it('n’affiche pas d’astérisque si required est absent', () => {
    render(<FieldLabel htmlFor="nom">Nom</FieldLabel>)
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })

  it('rend une icône à gauche si icon est fourni', () => {
    const { container } = render(
      <FieldLabel htmlFor="tel" icon="phone">
        Téléphone
      </FieldLabel>,
    )
    expect(container.querySelector('use[href="/icons.svg#i-phone"]')).not.toBeNull()
  })

  it('applique la typo uppercase + tracking 0.4', () => {
    const { container } = render(<FieldLabel htmlFor="x">Label</FieldLabel>)
    const label = container.querySelector('label')!
    expect(label.className).toMatch(/uppercase/)
    expect(label.className).toMatch(/tracking-\[0\.4px\]/)
  })
})
