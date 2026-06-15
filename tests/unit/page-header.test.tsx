import { render, screen } from '@testing-library/react'
import { PageHeader } from '@/components/ui/PageHeader'

describe('<PageHeader />', () => {
  it('rend le titre dans un <h1>', () => {
    render(<PageHeader title="Mes favoris" />)
    expect(screen.getByRole('heading', { level: 1, name: /mes favoris/i })).toBeInTheDocument()
  })

  it('rend le subtitle quand fourni', () => {
    render(<PageHeader title="Mes favoris" subtitle="Les opportunités sauvegardées" />)
    expect(screen.getByText(/les opportunités sauvegardées/i)).toBeInTheDocument()
  })

  it('ne rend aucun paragraphe sans subtitle', () => {
    const { container } = render(<PageHeader title="Titre seul" />)
    expect(container.querySelector('p')).toBeNull()
  })

  it('rend le slot actions à droite', () => {
    render(
      <PageHeader title="Mes favoris" actions={<button type="button">CTA</button>} />,
    )
    expect(screen.getByRole('button', { name: /cta/i })).toBeInTheDocument()
  })

  it('applique la classe font-black sur le h1 (uniformité visuelle)', () => {
    render(<PageHeader title="x" />)
    expect(screen.getByRole('heading', { level: 1 }).className).toMatch(/font-black/)
  })
})
