import { render, screen, fireEvent } from '@testing-library/react'
import { OpportunitesTabs } from '@/components/opportunites/OpportunitesTabs'

describe('<OpportunitesTabs />', () => {
  it('rend l\'onglet "Toutes" + un onglet par type Prisma avec libellés FR', () => {
    render(
      <OpportunitesTabs
        value={undefined}
        onChange={() => {}}
        counts={{
          all: 50,
          Emploi: 10,
          Stage: 8,
          Formation: 12,
          Bourse: 5,
          Volontariat: 7,
          Appel_a_projets: 8,
        }}
      />,
    )
    expect(screen.getByRole('tab', { name: /toutes/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /emplois/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /stages/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /formations/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /bourses/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /volontariat/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /appels à projets/i })).toBeInTheDocument()
  })

  it('marque "Toutes" comme actif quand value est undefined', () => {
    render(
      <OpportunitesTabs
        value={undefined}
        onChange={() => {}}
        counts={{ all: 0 }}
      />,
    )
    expect(screen.getByRole('tab', { name: /toutes/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('propage la valeur enum Prisma sur clic d\'un type (pas le slug)', () => {
    const onChange = jest.fn()
    render(
      <OpportunitesTabs
        value={undefined}
        onChange={onChange}
        counts={{ all: 0, Stage: 3 }}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: /stages/i }))
    expect(onChange).toHaveBeenCalledWith('Stage')
  })

  it('renvoie undefined quand on clique sur "Toutes"', () => {
    const onChange = jest.fn()
    render(
      <OpportunitesTabs
        value="Stage"
        onChange={onChange}
        counts={{ all: 0, Stage: 0 }}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: /toutes/i }))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('affiche le compteur 0 sans masquer l\'onglet', () => {
    render(
      <OpportunitesTabs
        value={undefined}
        onChange={() => {}}
        counts={{ all: 5, Bourse: 0 }}
      />,
    )
    const bourses = screen.getByRole('tab', { name: /bourses/i })
    expect(bourses).toBeInTheDocument()
    expect(bourses).toHaveTextContent('0')
  })
})
