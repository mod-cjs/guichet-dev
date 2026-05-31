import { render, screen } from '@testing-library/react'
import { Card } from '@/components/ui/Card'

describe('<Card />', () => {
  it('rend les enfants par défaut', () => {
    render(<Card>Contenu</Card>)
    expect(screen.getByText('Contenu')).toBeInTheDocument()
  })

  it('applique la variant opportunite (hover shadow)', () => {
    const { container } = render(<Card variant="opportunite">x</Card>)
    expect(container.firstChild).toHaveClass('hover:shadow-gj-md')
  })

  it('applique la variant mycard (texte blanc + rounded 2xl)', () => {
    const { container } = render(<Card variant="mycard">QR</Card>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/text-white/)
    expect(el.className).toMatch(/rounded-gj-2xl/)
  })

  it('honore padded=false (pas de padding interne)', () => {
    const { container } = render(<Card padded={false}>x</Card>)
    expect(container.firstChild).not.toHaveClass('p-space-4')
  })

  it('ajoute shadow-gj-md quand elevated', () => {
    const { container } = render(<Card elevated>x</Card>)
    expect(container.firstChild).toHaveClass('shadow-gj-md')
  })

  it('rend les slots header et footer', () => {
    render(
      <Card header={<span>HEAD</span>} footer={<span>FOOT</span>}>
        body
      </Card>,
    )
    expect(screen.getByText('HEAD')).toBeInTheDocument()
    expect(screen.getByText('body')).toBeInTheDocument()
    expect(screen.getByText('FOOT')).toBeInTheDocument()
  })

  it('peut être rendu comme balise sémantique via `as`', () => {
    const { container } = render(<Card as="article">art</Card>)
    expect(container.querySelector('article')).not.toBeNull()
  })
})
